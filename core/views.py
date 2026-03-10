from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.contrib.auth.models import User
from .models import TeamMember
import re


def login_view(request):
    field_errors = {
        "identifier": "",
        "username": "",
        "password": "",
    }

    # 🔥 Clear old messages on refresh
    if request.method == "GET":
        messages.get_messages(request)

    if request.method == "POST":
        role = request.POST.get("role")
        identifier = request.POST.get("identifier", "").strip()
        username_input = request.POST.get("username", "").strip()
        password = request.POST.get("password", "").strip()

        # ================= ROLE REQUIRED =================
        if not role:
            messages.error(request, "Please select a login role.")
            return render(request, "login.html", {"field_errors": field_errors})

        # ================= FIELD LEVEL VALIDATION =================
        if role == "team" and not identifier:
            field_errors["identifier"] = "User ID / Email is required."

        if not username_input:
            field_errors["username"] = "Username is required."

        if not password:
            field_errors["password"] = "Password is required."

        if any(field_errors.values()):
            return render(request, "login.html", {"field_errors": field_errors})

        # ================= ADMIN LOGIN (UNCHANGED) =================
        if role == "admin":
            user = authenticate(
                request,
                username=username_input,
                password=password
            )

            if not user:
                messages.error(request, "Invalid admin credentials.")
                return render(request, "login.html", {"field_errors": field_errors})

            if not user.is_staff:
                messages.error(request, "You are not authorized as Admin.")
                return render(request, "login.html", {"field_errors": field_errors})

            login(request, user)
            return redirect("leads")

        # ================= TEAM LOGIN =================

        # ✅ EMAIL FORMAT VALIDATION (NEW FIX)
        if "@" in identifier:
            email_regex = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
            if not re.match(email_regex, identifier):
                field_errors["identifier"] = "Enter a valid email address."
                return render(request, "login.html", {"field_errors": field_errors})

        # Resolve user
        try:
            if identifier.isdigit():
                user = User.objects.get(id=int(identifier))
            elif "@" in identifier:
                user = User.objects.get(email__iexact=identifier)
            else:
                user = User.objects.get(username__iexact=identifier)
        except User.DoesNotExist:
            field_errors["identifier"] = "Invalid User ID / Email."
            return render(request, "login.html", {"field_errors": field_errors})

        # Username mismatch
        if user.username.lower() != username_input.lower():
            field_errors["username"] = "Username does not match."
            return render(request, "login.html", {"field_errors": field_errors})

        # Password mismatch
        if not user.check_password(password):
            field_errors["password"] = "Incorrect password."
            return render(request, "login.html", {"field_errors": field_errors})

        # Team member check
        try:
            TeamMember.objects.get(user=user, is_active=True)
        except TeamMember.DoesNotExist:
            messages.error(request, "You are not an active team member.")
            return render(request, "login.html", {"field_errors": field_errors})

        login(request, user)
        return redirect("team_dashboard")

    return render(request, "login.html", {"field_errors": field_errors})


# leads section
from django.shortcuts import render, redirect
from django.http import JsonResponse
from .models import Lead

from django.db.models import Sum
from .models import Lead

# def leads_view(request):
#     auto_move_new_to_followup(days_before=14)
#     new_leads = Lead.objects.filter(status="NEW")
#     follow_up = Lead.objects.filter(status="FOLLOW_UP")
#     accepted = Lead.objects.filter(status="ACCEPTED")
#     lost = Lead.objects.filter(status="LOST")

#     context = {
#         "new_leads": new_leads,
#         "follow_up": follow_up,
#         "accepted": accepted,
#         "lost": lost,

#         # ✅ OVERVIEW COUNTS
#         "total_leads": Lead.objects.count(),

#         # ✅ AMOUNTS (safe even if NULL)
#         "total_amount": Lead.objects.aggregate(
#             total=Sum("total_amount")
#         )["total"] or 0,

#         "accepted_amount": accepted.aggregate(
#             total=Sum("paid_amount")
#         )["total"] or 0,

#         "lost_amount": lost.aggregate(
#             total=Sum("total_amount")
#         )["total"] or 0,
#     }

#     return render(request, "leads.html", context)

from datetime import timedelta
from django.shortcuts import render
from django.utils.timezone import now
from django.db.models import Sum, F, Q

from .models import Lead


def leads_view(request):
    # 🔁 AUTOMATIC MOVE (NEW → FOLLOW_UP)
    auto_move_new_to_followup(days_before=14)

    leads = Lead.objects.all()
    today = now().date()

    # =====================================================
    # 1️⃣ EVENT DATE FILTER
    # =====================================================
    event_range = request.GET.get("event_range")

    if event_range == "7":
        leads = leads.filter(
            event_start_date__range=(today, today + timedelta(days=7))
        )
    elif event_range == "14":
        leads = leads.filter(
            event_start_date__range=(today, today + timedelta(days=14))
        )
    elif event_range == "month":
        leads = leads.filter(
            event_start_date__year=today.year,
            event_start_date__month=today.month
        )

    event_from = request.GET.get("event_from")
    event_to = request.GET.get("event_to")
    if event_from and event_to:
        leads = leads.filter(
            event_start_date__range=(event_from, event_to)
        )

    # =====================================================
    # 2️⃣ FOLLOW-UP DATE FILTER
    # =====================================================
    follow_up = request.GET.get("follow_up")

    if follow_up == "today":
        leads = leads.filter(follow_up_date=today)

    elif follow_up == "week":
        leads = leads.filter(
            follow_up_date__range=(today, today + timedelta(days=7))
        )

    elif follow_up == "overdue":
        leads = leads.filter(follow_up_date__lt=today)

    # =====================================================
    # 3️⃣ STATUS FILTER
    # =====================================================
    statuses = request.GET.getlist("status")
    if statuses:
        leads = leads.filter(status__in=statuses)

    # =====================================================
    # 4️⃣ AMOUNT FILTER
    # =====================================================
    amount = request.GET.get("amount")

    if amount == "low":
        leads = leads.filter(total_amount__lt=20000)

    elif amount == "mid":
        leads = leads.filter(total_amount__range=(20000, 50000))

    elif amount == "high":
        leads = leads.filter(total_amount__gt=50000)

    min_amount = request.GET.get("min_amount")
    max_amount = request.GET.get("max_amount")

    if min_amount and max_amount:
        leads = leads.filter(
            total_amount__range=(min_amount, max_amount)
        )

    # =====================================================
    # 5️⃣ PAYMENT STATUS
    # =====================================================
    payment = request.GET.get("payment")

    if payment == "full":
        leads = leads.filter(paid_amount=F("total_amount"))

    elif payment == "partial":
        leads = leads.filter(
            paid_amount__gt=0,
            paid_amount__lt=F("total_amount")
        )

    elif payment == "none":
        leads = leads.filter(paid_amount=0)

    # =====================================================
    # 6️⃣ EVENT TYPE
    # =====================================================
    event_types = request.GET.getlist("event_type")
    if event_types:
        leads = leads.filter(event_type__in=event_types)

    # =====================================================
    # 7️⃣ PRIORITY (DERIVED)
    # =====================================================
    priority = request.GET.get("priority")

    if priority == "urgent":
        leads = leads.filter(follow_up_date__lte=today)

    elif priority == "upcoming":
        leads = leads.filter(
            follow_up_date__range=(today, today + timedelta(days=7))
        )

    elif priority == "safe":
        leads = leads.filter(
            follow_up_date__gt=today + timedelta(days=7)
        )

    # =====================================================
    # 8️⃣ SEARCH (CLIENT / PHONE / EMAIL / LOCATION)
    # =====================================================
    search = request.GET.get("search")

    if search:
        leads = leads.filter(
            Q(client_name__icontains=search) |
            Q(phone__icontains=search) |
            Q(email__icontains=search) |
            Q(event_location__icontains=search)
        )

    # =====================================================
    # SPLIT FOR KANBAN
    # =====================================================
    new_leads = leads.filter(status="NEW").order_by('position')
    follow_up_leads = leads.filter(status="FOLLOW_UP").order_by('position')
    accepted_leads = leads.filter(status="ACCEPTED").order_by('position')
    lost_leads = leads.filter(status="LOST").order_by('position')

    # =====================================================
    # CONTEXT
    # =====================================================
    context = {
        "new_leads": new_leads,
        "follow_up": follow_up_leads,
        "accepted": accepted_leads,
        "lost": lost_leads,

        "total_leads": leads.count(),

        "total_amount": leads.aggregate(
            total=Sum("total_amount")
        )["total"] or 0,

        "accepted_amount": accepted_leads.aggregate(
            total=Sum("paid_amount")
        )["total"] or 0,

       "lost_quoted_amount": lost_leads.aggregate(
    total=Sum("total_amount")
)["total"] or 0,

"lost_paid_amount": lost_leads.aggregate(
    total=Sum("paid_amount")
)["total"] or 0,
    }

    return render(request, "leads.html", context)




import json
from django.http import JsonResponse

def update_position(request):
    data = json.loads(request.body)

    for item in data["order"]:
        Lead.objects.filter(id=item["id"]).update(position=item["position"])

    return JsonResponse({"ok": True})

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Lead
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

@csrf_exempt
def save_lead(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Invalid request"}, status=405)

    try:
        lead_id = request.POST.get("lead_id")

        # ===============================
        # CREATE / EDIT
        # ===============================
        if lead_id:
            lead = Lead.objects.get(id=lead_id)
        else:
            lead = Lead(status="NEW")

        # ===============================
        # CLIENT DETAILS
        # ===============================
        lead.client_name = request.POST.get("client_name", "")
        lead.phone = request.POST.get("phone", "")
        lead.email = request.POST.get("email", "")

        # ===============================
        # EVENT DETAILS
        # ===============================
        lead.event_type = request.POST.get("event_type", "")
        lead.event_start_date = request.POST.get("event_start_date") or None
        lead.event_start_session = request.POST.get("event_start_session")
        lead.event_end_date = request.POST.get("event_end_date") or None
        lead.event_end_session = request.POST.get("event_end_session")
        lead.follow_up_date = request.POST.get("follow_up_date") or None
        lead.event_location = request.POST.get("event_location", "")

        # ✅ ENSURE NUMBER (VERY IMPORTANT)
        lead.total_amount = float(request.POST.get("total_amount") or 0)

        # ===============================
        # ✅ SERVICES (JSON)
        # ===============================
        services_json = request.POST.get("selected_services")

        if services_json:
            lead.selected_services = json.loads(services_json)
        else:
            lead.selected_services = []   # 🔥 reset if nothing sent


        pricing_json = request.POST.get("pricing_data")
        if pricing_json:
            lead.pricing_data = json.loads(pricing_json)

        lead.save()

        return JsonResponse({
            "success": True,
            "mode": "updated" if lead_id else "created",
            "id": lead.id
        })

    except Exception as e:
        return JsonResponse(
            {"success": False, "error": str(e)},
            status=400
        )
from django.utils import timezone
def update_lead_status(request):
    if request.method == "POST":
        lead = Lead.objects.get(id=request.POST["lead_id"])
        lead.status = request.POST["status"]

        if request.POST.get("paid_amount"):
            lead.paid_amount = request.POST["paid_amount"]
            lead.total_amount = request.POST["total_amount"]
      

        lead.created_at = timezone.now()
        lead.save()
        return JsonResponse({
    "success": True,
    "follow_up_date": lead.follow_up_date.strftime("%b %d, %Y") if lead.follow_up_date else None
})
    
# editing lead
from django.http import JsonResponse
from .models import Lead

def get_lead(request, lead_id):
    lead = Lead.objects.get(id=lead_id)

    return JsonResponse({
        "id": lead.id,
        "client_name": lead.client_name,
        "phone": lead.phone,
        "email": lead.email,
        "event_type": lead.event_type,
        "event_start_date": lead.event_start_date,
        "event_start_session": lead.event_start_session,
        "event_end_date": lead.event_end_date,
        "event_end_session": lead.event_end_session,
        "follow_up_date": lead.follow_up_date,
        "event_location": lead.event_location,
        "total_amount": lead.total_amount,
        "selected_services": lead.selected_services or [],
        "pricing_data": lead.pricing_data or {}
    })

# automatic moving from new to column
from datetime import timedelta
from django.utils.timezone import now
from .models import Lead

def auto_move_new_to_followup(days_before=14):
    """
    Automatically move NEW leads to FOLLOW_UP
    when event date is within `days_before`
    """
    today = now().date()
    threshold_date = today + timedelta(days=days_before)

    Lead.objects.filter(
        status="NEW",
        event_start_date__lte=threshold_date
    ).update(status="FOLLOW_UP")



# ------follow up reminder
from django.utils.timezone import now
from django.views.decorators.http import require_POST

def followup_panel_data(request):
    today = now().date()

    base_qs = Lead.objects.filter(
        follow_up_date__isnull=False
    ).exclude(status__in=["ACCEPTED", "LOST"])

    overdue = base_qs.filter(follow_up_date__lt=today)
    today_qs = base_qs.filter(follow_up_date=today)
    upcoming = base_qs.filter(follow_up_date__gt=today)

    return JsonResponse({
        "counts": {
            "overdue": overdue.count(),
            "today": today_qs.count(),
            "upcoming": upcoming.count(),
            "total": base_qs.count()
        },
        "today": list(today_qs.values(
            "id", "client_name", "phone", "event_type", "follow_up_date"
        )),
        "overdue": list(overdue.values(
            "id", "client_name", "phone", "event_type", "follow_up_date"
        )),
        "upcoming": list(upcoming.values(
            "id", "client_name", "phone", "event_type", "follow_up_date"
        )),
    })


@require_POST
def mark_followup_done(request):
    lead = Lead.objects.get(id=request.POST["lead_id"])
    lead.follow_up_date = None
    lead.save()
    return JsonResponse({"success": True})

# ---------------projects section
from collections import defaultdict
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from .models import Project, TeamMember

# helper function for pre production card
from .utils.project_cards import build_pre_card_data

ROLE_CATEGORY_MAP = {
    "ASSISTANT": "general",
    "PHOTOGRAPHER": "pre",
    "VIDEOGRAPHER": "pre",
    "EDITOR": "post",
}

from collections import defaultdict
from django.shortcuts import render
from .models import Project, TeamMember
from .utils.project_cards import build_pre_card_data,build_post_card_data
from .utils.project_overview import (
    get_pending_internal_projects,
    get_awaiting_client_projects
)
from django.db.models import Count, Q
from datetime import date
from calendar import monthrange

ROLE_CATEGORY_MAP = {
    "ASSISTANT": "general",
    "PHOTOGRAPHER": "pre",
    "VIDEOGRAPHER": "pre",
    "EDITOR": "post",
}

def projects_view(request):
    # =====================
    # PROJECT QUERY (OPTIMIZED)
    # =====================
    projects = Project.objects.select_related("lead").prefetch_related(
    "tasks",
    "team_assignments__member__user"
)
    print(projects)
     # ---- Month + Year ----
    month = request.GET.get("month")
    year  = request.GET.get("year")

    if month and year:
        month = int(month)
        year = int(year)

        start = date(year, month, 1)
        end = date(year, month, monthrange(year, month)[1])

        projects = projects.filter(
            lead__event_start_date__range=(start, end)
        )

    # ---- Custom Date Override ----
    from_date = request.GET.get("from_date")
    to_date   = request.GET.get("to_date")

    if from_date and to_date:
        projects = projects.filter(
            lead__event_start_date__range=(from_date, to_date)
        )

    # ---- Status ----
    statuses = request.GET.getlist("status")
    if statuses:
        projects = projects.filter(status__in=statuses)

    # ---- Completion ----
    completion = request.GET.get("completion")

    if completion == "COMPLETED":
        projects = projects.filter(
            ~Q(tasks__status__in=["OPEN", "ON_HOLD"])
        )

    elif completion == "PENDING":
        projects = projects.filter(
            tasks__status__in=["OPEN", "ON_HOLD"]
        )

    

    # =====================
    # TEAM MEMBERS
    # =====================
    members = TeamMember.objects.filter(is_active=True)
    grouped_team = defaultdict(list)

    for member in members:
        category = ROLE_CATEGORY_MAP.get(member.role)
        if category:
            grouped_team[category].append(member)

    # =====================
    # PROJECT OVERVIEW DATA
    # =====================
    pending_internal = get_pending_internal_projects(projects)
    awaiting_client = get_awaiting_client_projects(projects)

    # =====================
    # CONTEXT
    # =====================
    projects = projects.order_by('-created_at')
    context = {
        # PROJECT COLUMNS
       
        "assigned": projects.filter(status="ASSIGNED"),
        "pre_cards": build_pre_card_data(projects.filter(status="PRE")),
        "selection": projects.filter(status="SELECTION"),
        "post": build_post_card_data(
    projects.filter(status="POST")
),
        "completed": projects.filter(status="COMPLETED"),

        # # TEAM GROUPS
        # "general_team": grouped_team["general"],
        # "pre_team": grouped_team["pre"],
        # "post_team": grouped_team["post"],
          # 🔥 PROJECT OVERVIEW
        "pending_internal": pending_internal,
        "awaiting_client": awaiting_client,
    }

    return render(request, "projects.html", context)




from django.http import JsonResponse
from .models import Project

@require_POST
def update_project_status(request):
    project = get_object_or_404(Project, id=request.POST.get("project_id"))
    project.status = request.POST.get("status")
    project.created_at = timezone.now()
    project.save()

    return JsonResponse({"success": True})
# ============================
# PROJECTS – POPUP HANDLERS
# ============================

from django.views.decorators.http import require_POST
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import Project,ProjectTeam,ProjectNotification

@require_POST
def assign_team_members(request):
    project = get_object_or_404(Project, id=request.POST["project_id"])
    member_ids = request.POST.get("members", "").split(",")

    ProjectTeam.objects.filter(project=project).delete()
    ProjectNotification.objects.filter(project=project).delete()

    assigned_members = []

    for mid in member_ids:
        if mid:
            pt = ProjectTeam.objects.create(
                project=project,
                member_id=mid
            )
            ProjectNotification.objects.create(
                project=project,
                member_id=mid
            )
            assigned_members.append({
                "id": pt.member.id,
                "name": pt.member.user.get_full_name() or pt.member.user.username
            })

    return JsonResponse({
        "success": True,
        "project_id": project.id,
        "assigned_team": assigned_members
    })


# @require_POST
# def assign_team_members(request):
#     project = get_object_or_404(Project, id=request.POST["project_id"])
#     member_ids = request.POST.get("members", "").split(",")

#     ProjectTeam.objects.filter(project=project).delete()

#     for mid in member_ids:
#         if mid:
#             ProjectTeam.objects.create(
#                 project=project,
#                 member_id=mid
#             )

#     return JsonResponse({"success": True})
# @require_POST
# def assign_team_members(request):
#     project = get_object_or_404(Project, id=request.POST["project_id"])
#     member_ids = request.POST.get("members", "").split(",")

#     # 1️⃣ Clear old assignments
#     ProjectTeam.objects.filter(project=project).delete()

#     assigned_members = []

#     # 2️⃣ Assign new members
#     for mid in member_ids:
#         if mid:
#             pt = ProjectTeam.objects.create(
#                 project=project,
#                 member_id=mid
#             )
#             assigned_members.append({
#                 "id": pt.member.id,
#                 "name": pt.member.user.get_full_name() or pt.member.user.username
#             })

#     # 3️⃣ 🔥 THIS IS THE KEY LINE
#     project.status = "PRE"   # or "IN_PROGRESS" if you prefer
#     project.save()

#     # 4️⃣ Send data back to frontend
#     return JsonResponse({
#         "success": True,
#         "project_id": project.id,
#         "status": project.status,
#         "assigned_team": assigned_members
#     })





@require_POST
def assign_project_tasks(request):
    """
    TEMP IMPLEMENTATION

    Handles task assignment popup.
    Currently:
    - Validates project
    - Keeps status as PRE
    - No task persistence yet

    Future:
    - Create Task model
    - Assign tasks to members
    - Track progress per task
    """

    project_id = request.POST.get("project_id")

    if not project_id:
        return JsonResponse(
            {"success": False, "error": "Project ID missing"},
            status=400
        )

    project = get_object_or_404(Project, id=project_id)

    # 🔒 No DB update yet
    # project.status = "PRE"  ← already handled by drag-drop logic

    return JsonResponse({
        "success": True,
        "message": "Tasks assigned (temporary)",
        "project_id": project.id
    })


# team memeber adding 
from django.contrib.auth.decorators import user_passes_test
from django.contrib.auth.models import User
from .models import TeamMember

def is_admin(user):
    return user.is_authenticated and user.is_staff


@user_passes_test(is_admin)
def team_members_view(request):
    members = TeamMember.objects.all()

    context = {
        "members": members,
        "total": members.count(),
        "active": members.filter(is_active=True).count(),
        "inactive": members.filter(is_active=False).count(),
    }
    return render(request, "team_members.html", context)

@user_passes_test(is_admin)
def create_team_member(request):
    if request.method == "POST":
        name = request.POST["name"]
        username = request.POST["username"]
        password = request.POST["password"]
        role = request.POST["role"]

        # ✅ Create login user
        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=name,   # ✅ store name here
            is_staff=False
        )

        # ✅ Create team profile
        TeamMember.objects.create(
            user=user,        # 🔥 THIS WAS MISSING
            role=role,
            is_active=True
        )

        return redirect("team_members")



# 
# from django.http import JsonResponse
# from django.shortcuts import get_object_or_404
# from .models import Project

# def project_details_api(request, project_id):
#     project = get_object_or_404(Project, id=project_id)
#     lead = project.lead

#     return JsonResponse({
#         "client_name": project.client_name or lead.client_name,
#         "location": lead.event_location,
#         "start_date": lead.event_start_date.strftime("%d/%m/%Y"),
#         "end_date": lead.event_end_date.strftime("%d/%m/%Y"),
#         "start_session": lead.event_start_session,
#         "event_type": lead.event_type,
#           "available_members": lead.available_members_data,
#     "booked_members": booked_members_data,
#     })
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import Project, TeamMember, ProjectTeam
from django.db.models import Q

def project_details_api(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    lead = project.lead

    start_date = lead.event_start_date
    end_date = lead.event_end_date

    available_members = []
    booked_members = []

    members = TeamMember.objects.select_related("user")

    for member in members:
        overlapping_projects = Project.objects.filter(
    team_assignments__member=member,
    status__in=["PRE", "SELECTION", "POST", "COMPLETED"]  # 🔥 IMPORTANT
).exclude(id=project.id).filter(
    Q(lead__event_start_date__lte=end_date) &
    Q(lead__event_end_date__gte=start_date) &
    (
        Q(lead__event_start_session__in=[
            lead.event_start_session,
            lead.event_end_session
        ]) |
        Q(lead__event_end_session__in=[
            lead.event_start_session,
            lead.event_end_session
        ])
    )
)



        data = {
            "id": member.id,
            "name": member.user.get_full_name() or member.user.username,
            "role": member.role,
        }

        if overlapping_projects.exists():
            booked_project = overlapping_projects.first()
            data["booked_info"] = f"{booked_project.lead.event_type} | {booked_project.lead.event_start_date}"
            booked_members.append(data)
        else:
            available_members.append(data)

    return JsonResponse({
        "client_name": project.client_name or lead.client_name,
        "location": lead.event_location,
        "start_date": lead.event_start_date.strftime("%d/%m/%Y"),
        "end_date": lead.event_end_date.strftime("%d/%m/%Y"),
        "start_session": lead.event_start_session,
        "event_type": lead.event_type,
        "general_team": available_members,
        "booked_members": booked_members,
    })



# Projects tab task assigning

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import Project, ProjectTask, TeamMember

DEFAULT_TASKS = {
    "WEDDING": [
        ("PLANNING", "Create Excel Sheet"),
        ("PLANNING", "Create WhatsApp Group"),
        ("PLANNING", "Dates & Schedule"),
        ("PLANNING", "Team Schedule"),
        ("HARD_DISK", "Hard Disk Collection"),
        ("HARD_DISK", "Acknowledgement From Client"),
        ("PRE_WEDDING", "Fix Pre-Wedding Date With Client"),
        ("MAIN", "Final Confirmation & Checklist"),
    ],
    "BABY_SHOWER": [
        ("PLANNING", "Client Coordination"),
        ("MAIN", "Main Event Coverage"),
    ]
}

def project_tasks_api(request, project_id):
    project = get_object_or_404(Project, id=project_id)

    # ==================================
    # 1️⃣ NORMALIZE EVENT TYPE
    # ==================================
    raw_event = (project.lead.event_type or "").strip().upper()

    EVENT_TYPE_MAP = {
        "WEDDING": "WEDDING",
        "MARRIAGE": "WEDDING",
        "BIRTHDAY": "WEDDING",
        "BABY SHOWER": "BABY_SHOWER",
        "BABY_SHOWER": "BABY_SHOWER",
    }

    event_key = EVENT_TYPE_MAP.get(raw_event)

    # ==================================
    # 2️⃣ CREATE DEFAULT TASKS (ONCE)
    # ==================================
    # if event_key and project.tasks.count() == 0:
    #     for phase, title in DEFAULT_TASKS.get(event_key, []):
    #         ProjectTask.objects.create(
    #             project=project,
    #             phase=phase,
    #             title=title,
    #             status="PENDING"
    #         )
    if event_key:
        existing = set(
        project.tasks.values_list("phase", "title")
    )

    for phase, title in DEFAULT_TASKS.get(event_key, []):
        if (phase, title) not in existing:
            ProjectTask.objects.create(
                project=project,
                phase=phase,
                title=title,
                status="PENDING"
            )


    # ==================================
    # 3️⃣ FETCH TASKS
    # ==================================
    tasks = project.tasks.select_related("assigned_to__user")

    response = {
        "tasks": {},
        "team_members": []
    }

    # ==================================
    # 4️⃣ GROUP TASKS BY PHASE KEY
    # ==================================
    for task in tasks:
        phase_key = task.phase   # 🔥 IMPORTANT

        response["tasks"].setdefault(phase_key, []).append({
            "id": task.id,
            "code": f"AK-{task.id}",
            "title": task.title,
            "assigned_to_id": task.assigned_to.id if task.assigned_to else None,
            "status": task.status,
            "start_date": task.start_date,
            "due_date": task.due_date,
            "progress": 0
        })

    # ==================================
    # 5️⃣ ASSIGNED TEAM MEMBERS
    # ==================================
    assigned_members = TeamMember.objects.filter(
        projectteam__project=project
    ).select_related("user").distinct()

    for m in assigned_members:
        response["team_members"].append({
            "id": m.id,
            "name": m.user.get_full_name() or m.user.username,
            "role": m.role
        })

    return JsonResponse(response)


# adding new task
from django.views.decorators.http import require_POST

@require_POST
def add_project_task(request):
    project = get_object_or_404(Project, id=request.POST["project_id"])

    task = ProjectTask.objects.create(
        project=project,
        phase=request.POST["phase"],
        title=request.POST["title"],
        description=request.POST.get("description"),
        assigned_to_id=request.POST.get("assigned_to") or None,
        start_date=request.POST.get("start_date") or None,
        due_date=request.POST.get("due_date") or None,
        status="PENDING"
    )

    return JsonResponse({"success": True, "task_id": task.id})


# editing tasks
from core.utils.project_flow import auto_move_pre_to_selection,auto_move_selection_to_post ,  auto_move_post_to_completed
@require_POST
def update_project_task(request):
    task = get_object_or_404(ProjectTask, id=request.POST["task_id"])

    task.title = request.POST.get("title", task.title)
    task.assigned_to_id = request.POST.get("assigned_to", task.assigned_to)
    task.start_date = request.POST.get("start_date", task.start_date)
    task.due_date = request.POST.get("due_date", task.due_date)
    task.status = request.POST.get("status", task.status)

    task.save()
    project = task.project
    
    if task.assigned_to and project.status == "PRE":
        project.status = "PRE"   # explicit (safe)
        project.save()
    # 🔥 ONE LINE BUSINESS LOGIC
    auto_move_pre_to_selection(task.project)
    auto_move_selection_to_post(task.project)
    auto_move_post_to_completed(project) 

    return JsonResponse({"success": True})



# deleting
@require_POST
def delete_project_task(request):
    task = get_object_or_404(ProjectTask, id=request.POST["task_id"])
    task.delete()
    return JsonResponse({"success": True})



# core/views/sessions.py
from django.shortcuts import render
from django.utils.timezone import now
from collections import defaultdict
from core.models import Project

def sessions_view(request):
    today = now().date()
    current_year = today.year
    current_month = today.month

    tab = request.GET.get("tab")  # no default → no active tab initially

    projects = Project.objects.select_related("lead").prefetch_related(
        "tasks",
        "team_assignments__member__user"
    )

    # 🔥 STRICT MONTH-BASED FILTERING (FIXED)
    if tab == "upcoming":
        # ONLY current month
        projects = projects.filter(
            lead__event_start_date__year=current_year,
            lead__event_start_date__month=current_month
        )

    elif tab == "past":
        # ANY month BEFORE current month (same year OR previous years)
        projects = projects.filter(
            lead__event_start_date__lt=now().date().replace(
                year=current_year,
                month=current_month,
                day=1
            )
        )

    elif tab == "future":
        # ANY month AFTER current month
        projects = projects.filter(
            lead__event_start_date__year__gte=current_year
        ).exclude(
            lead__event_start_date__year=current_year,
            lead__event_start_date__month__lte=current_month
        )

    # tab == None → NO FILTER → ALL PROJECTS

    # ✅ MONTH GROUPING (SAFE)
    grouped = defaultdict(list)
    for p in projects:
        if p.lead and p.lead.event_start_date:
            month_key = p.lead.event_start_date.strftime("%B %Y")
            grouped[month_key].append(p)

    return render(request, "sessions.html", {
        "grouped_projects": dict(grouped),
        "active_tab": tab,
    })


# invoice page view
# invoice/views.py

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from core.models import Project
from .models import Invoice, InvoiceItem
import json


# ===============================
# PAGE
# ===============================
# views.py
# def project_invoice_view(request):
#     invoices = Invoice.objects.select_related("project").order_by("-created_at")

#     pending = invoices.filter(status__in=["PENDING", "DRAFT"])
#     completed = invoices.filter(status="COMPLETED")

#     context = {
#         "pending_invoices": pending,
#         "completed_invoices": completed,
#         "paid_amount": completed.aggregate(Sum("total"))["total__sum"] or 0,
#         "upcoming_amount": pending.aggregate(Sum("total"))["total__sum"] or 0,
#         "past_due_amount": invoices.filter(due_date__lt=timezone.now()).aggregate(
#             Sum("total")
#         )["total__sum"] or 0,
#     }
#     return render(request, "project_invoice.html", context)
def project_invoice_view(request):
    invoices = Invoice.objects.select_related("project") \
        .exclude(status="DRAFT") \
        .order_by("-created_at")

    pending = invoices.filter(status="PENDING")
    completed = invoices.filter(status="COMPLETED")

    context = {
        "pending_invoices": pending,
        "completed_invoices": completed,

        "paid_amount": completed.aggregate(
            total=Sum("total")
        )["total"] or 0,

        "upcoming_amount": pending.aggregate(
            total=Sum("total")
        )["total"] or 0,

        "past_due_amount": invoices.filter(
            due_date__lt=timezone.now()
        ).aggregate(
            total=Sum("total")
        )["total"] or 0,
    }

    return render(request, "project_invoice.html", context)


# ===============================
# CREATE INVOICE
# ===============================
@require_POST
def create_invoice(request):
    project = get_object_or_404(Project, id=request.POST["project_id"])
    lead = project.lead

    invoice = Invoice.objects.create(
        project=project,
        status="DRAFT"
    )

    services = lead.selected_services or []

    # ===== PACKAGE (ONLY ONE) =====
    package = next((s for s in services if s.get("category") == "PACKAGE"), None)

    if package:
        InvoiceItem.objects.create(
            invoice=invoice,
            service_key=package["key"],
            service_label=package["label"],   # Wedding / Engagement
            members={
                "crew": package.get("crew", []),
                "deliverables": [d["label"] for d in package.get("deliverables", [])]
            },
            quantity=1,
            unit_price=package.get("price", 0)
        )

    # ===== EXTRA ITEMS =====
    for service in services:
        if service.get("category") == "EXTRA":
            InvoiceItem.objects.create(
                invoice=invoice,
                service_key=service["key"],
                service_label=service["label"],
                members={},
                quantity=1,
                unit_price=service.get("price", 0)
            )

    recalc_invoice(invoice)

    return JsonResponse({
        "invoice_id": invoice.id,
        "client": lead.client_name,
        "email": lead.email,
        **serialize_invoice(invoice)
    })

# ===============================
# ADD ITEM
# ===============================

@require_POST
def add_invoice_item(request):
    invoice = get_object_or_404(Invoice, id=request.POST["invoice_id"])

    if invoice.status != "DRAFT":
        return JsonResponse({"error": "Invoice locked"}, status=400)

    members = json.loads(request.POST.get("members", "{}"))

    InvoiceItem.objects.create(
        invoice=invoice,
        service_key=request.POST["service_key"],
        service_label=request.POST["service_label"],
        members=members,
        quantity=int(request.POST["quantity"]),
        unit_price=float(request.POST["unit_price"]),
    )

    recalc_invoice(invoice)
    return JsonResponse(serialize_invoice(invoice))


# ===============================
# UPDATE QTY (INLINE EDIT)
# ===============================

@require_POST
def update_item_qty(request):
    item = get_object_or_404(InvoiceItem, id=request.POST["item_id"])
    invoice = item.invoice

    if invoice.status != "DRAFT":
        return JsonResponse({"error": "Invoice locked"}, status=400)

    item.quantity = int(request.POST["quantity"])
    item.save()

    recalc_invoice(invoice)
    return JsonResponse(serialize_invoice(invoice))


# ===============================
# DELETE ITEM
# ===============================

@require_POST
def delete_invoice_item(request):
    item = get_object_or_404(InvoiceItem, id=request.POST["item_id"])
    invoice = item.invoice

    if invoice.status != "DRAFT":
        return JsonResponse({"error": "Invoice locked"}, status=400)

    item.delete()
    recalc_invoice(invoice)
    return JsonResponse(serialize_invoice(invoice))


# ===============================
# APPLY TAX
# ===============================

# ===============================
# APPLY TAX
# ===============================

from decimal import Decimal   # ✅ add this import at top

@require_POST
def apply_tax(request):
    invoice = get_object_or_404(Invoice, id=request.POST["invoice_id"])

    if invoice.status != "DRAFT":
        return JsonResponse({"error": "Invoice locked"}, status=400)

    tax = Decimal(request.POST["tax"])          # ✅ convert to Decimal
    invoice.tax_amount = tax
    invoice.total = invoice.subtotal + tax      # ✅ Decimal + Decimal
    invoice.save()

    return JsonResponse(serialize_invoice(invoice))

# ===============================
# LOCK / GENERATE INVOICE
# ===============================

@require_POST
def generate_invoice(request):
    invoice = get_object_or_404(Invoice, id=request.POST["invoice_id"])
    due_date = request.POST.get("due_date")

    if invoice.status != "DRAFT":
        return JsonResponse({"error": "Already locked"}, status=400)
        
    invoice.status = "PENDING"
    if due_date:
        invoice.due_date = due_date

    invoice.save()

    return JsonResponse({
        "success": True,
        "status": invoice.status
    })


# ===============================
# HELPERS
# ===============================

def recalc_invoice(invoice):
    subtotal = sum(item.amount for item in invoice.items.all())
    invoice.subtotal = subtotal
    invoice.total = subtotal + invoice.tax_amount
    invoice.save()


def serialize_invoice(invoice):
    return {
        "subtotal": float(invoice.subtotal),
        "tax": float(invoice.tax_amount),
        "total": float(invoice.total),
        "status": invoice.status,
        "items": [
            {
                "id": item.id,
                "label": item.service_label,
                "qty": item.quantity,
                "price": float(item.unit_price),
                "amount": float(item.amount),
                "members": item.members,
            }
            for item in invoice.items.all()
        ],
    }


# generated invoice popup views
# ===============================
# PREVIEW INVOICE (READ ONLY)
# ===============================
from django.views.decorators.http import require_GET

@require_GET
def preview_invoice(request, invoice_id):
    invoice = get_object_or_404(Invoice, id=invoice_id)
    project = invoice.project
    lead = project.lead

    # ---------- HOURS LOGIC ----------
    if (
        lead.event_start_session == "Morning"
        and lead.event_end_session == "Morning"
    ):
        hours = "04:00"
    else:
        hours = "08:00"

    rows = []

    # ---------- PACKAGE FIRST ----------
    package_item = invoice.items.filter(
        members__has_key="crew"
    ).first()

    if package_item:
        # Package row
        rows.append({
            "label": package_item.service_label,
            "charge": float(package_item.unit_price),
            "hours": hours,
            "total": float(package_item.amount),
        })

        # Fixed deliverables (₹0)
        for d in package_item.members.get("deliverables", []):
            rows.append({
                "label": f"– {d}",
                "charge": 0,
                "hours": hours,
                "total": 0,
            })

    # ---------- EXTRA ITEMS ----------
    extra_items = invoice.items.exclude(id=package_item.id)

    for item in extra_items:
        rows.append({
            "label": item.service_label,
            "charge": float(item.unit_price),
            "hours": hours,
            "total": float(item.amount),
        })

    return JsonResponse({
        "invoice_id": invoice.id,
        "client": lead.client_name,
        "email": lead.email,
        "location": lead.event_location,
        "paid": float(lead.paid_amount),
        "total": float(invoice.total),
        "due_date": invoice.due_date.strftime("%d %b %Y") if invoice.due_date else "",
        "rows": rows,
        "status": invoice.status,
    })

    # ===============================
# DOWNLOAD invoice PDF
# ===============================
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import json, os, weasyprint

@csrf_exempt
def download_invoice(request, invoice_id):
    data = json.loads(request.body)

    html_body = data["html"]
    invoice_id = data["invoice_id"]

    # 🔥 Load your existing CSS file
    css_path = os.path.join(
    settings.BASE_DIR,
    "core",
    "static",
    "css",
    "project_invoice.css"
)

    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()

    final_html = f"""
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          {css}

          /* PDF-specific fixes */
          body {{
            margin: 0;
            font-family: Inter, Arial, sans-serif;
          }}

          .gi-close,
          .gi-actions button {{
            display: none !important;
          }}

          .generated-invoice-overlay {{
            position: static !important;
            background: none !important;
          }}

          .generated-invoice-wrapper {{
            max-height: none !important;
            overflow: visible !important;
          }}
        </style>
      </head>
      <body>
        {html_body}
      </body>
    </html>
    """

    response = HttpResponse(content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="AK-{invoice_id}.pdf"'

    weasyprint.HTML(string=final_html).write_pdf(response)

    return response


@require_POST
def update_invoice_status(request):
    invoice = get_object_or_404(Invoice, id=request.POST["invoice_id"])
    invoice.status = request.POST["status"]
    invoice.save()
    return JsonResponse({"success": True})

from django.views.decorators.http import require_GET

@require_GET
def edit_invoice_data(request, invoice_id):
    invoice = get_object_or_404(Invoice, id=invoice_id)
    lead = invoice.project.lead

    return JsonResponse({
        "invoice_id": invoice.id,
        "client": lead.client_name,
        "email": lead.email,
        "due_date": invoice.due_date,
        "notes": invoice.notes,
        **serialize_invoice(invoice)
    })

    # team logins
from django.contrib.auth.decorators import login_required
from .models import TeamMember


# def team_dashboard(request):
#     team = request.user.team_profile

#     notifications = ProjectNotification.objects.filter(
#         member=team,
#         status="PENDING"
#     ).select_related("project", "project__lead")

#     return render(
#         request,
#         "team/dashboard.html",
#         {"notifications": notifications}
#     )
from django.utils import timezone
from django.db.models import Q

@login_required
def team_dashboard(request):
    team = request.user.team_profile

    notifications = ProjectNotification.objects.filter(
        member=team,
        status="PENDING"
    ).select_related("project", "project__lead")

    # ===== DASHBOARD COUNTS =====
    today = timezone.now().date()

    assigned_projects = Project.objects.filter(
        team_assignments__member=team,
        projectnotification__status="ACCEPTED"
    ).distinct().select_related("lead")

    ongoing_count = assigned_projects.filter(
        lead__event_start_date__lte=today,
        lead__event_end_date__gte=today
    ).exclude(status="COMPLETED").count()

    upcoming_count = assigned_projects.filter(
        lead__event_start_date__gt=today
    ).count()

    completed_count = assigned_projects.filter(
        status="COMPLETED"
    ).count()

    return render(
        request,
        "team/dashboard.html",
        {
            "notifications": notifications,
            "ongoing_count": ongoing_count,
            "upcoming_count": upcoming_count,
            "completed_count": completed_count,
        }
    )

# team dashboard
from django.db.models.functions import ExtractMonth

@login_required
def team_project_overview_api(request):
    team = request.user.team_profile
    year = request.GET.get("year")

    assigned_projects = Project.objects.filter(
        team_assignments__member=team,
        projectnotification__status="ACCEPTED",
        lead__event_start_date__year=year
    ).annotate(
        month=ExtractMonth("lead__event_start_date")
    )

    data = {i: 0 for i in range(1, 13)}

    for p in assigned_projects:
        data[p.month] += 1

    return JsonResponse({
        "months": list(data.keys()),
        "counts": list(data.values())
    })
  
@login_required
def team_notification_count(request):
    team = request.user.team_profile

    count = ProjectNotification.objects.filter(
        member=team,
        status="PENDING"
    ).count()

    return JsonResponse({"count": count})

@login_required
def team_notifications_api(request):
    team = request.user.team_profile

    notifications = ProjectNotification.objects.filter(
        member=team,
        status="PENDING"
    ).select_related("project", "project__lead")

    data = []

    for n in notifications:
        lead = n.project.lead
        data.append({
            "id": n.id,
            "project_id": f"AK-{n.project.id}",
            "project_name": lead.client_name,
            "event_date": f"{lead.event_start_date} – {lead.event_end_date}",
            "due_date": lead.follow_up_date,
        })

    return JsonResponse({"notifications": data})
from django.db.models import Prefetch

@login_required
def team_calendar_api(request):
    team = request.user.team_profile

    notifications = ProjectNotification.objects.filter(
        member=team
    ).select_related("project", "project__lead")

    events = []

    for n in notifications:
        lead = n.project.lead

        team_members = ProjectTeam.objects.filter(
            project=n.project
        ).select_related("member")

        members_data = [
            {
                "id": t.member.id,
                "name": t.member.user.get_full_name() or t.member.user.username
            }
            for t in team_members
        ]

        events.append({
            "date": lead.event_start_date,
            "title": lead.client_name,
            "event_type": lead.event_type,
            "location": lead.event_location,
            "project_id": n.project.id,
            "status": n.status,
            "team": members_data
        })

    return JsonResponse({"events": events})

@require_POST
@login_required
def accept_notification(request):
    notification = get_object_or_404(
        ProjectNotification,
        id=request.POST["notification_id"],
        member=request.user.team_profile
    )

    notification.status = "ACCEPTED"
    notification.save()
    TeamResponseNotification.objects.create(
        project=notification.project,
        member=notification.member,
        response_status="ACCEPTED"
    )


    return JsonResponse({"success": True})

@require_POST
@login_required
def reject_notification(request):
    notification = get_object_or_404(
        ProjectNotification,
        id=request.POST["notification_id"],
        member=request.user.team_profile
    )

    # remove assignment
    ProjectTeam.objects.filter(
        project=notification.project,
        member=notification.member
    ).delete()

    notification.status = "REJECTED"
    notification.save()
    # 🔥 CREATE ADMIN RESPONSE ENTRY
    TeamResponseNotification.objects.create(
        project=notification.project,
        member=notification.member,
        response_status="REJECTED"
    )


    return JsonResponse({"success": True})
from .models import TeamMember,TeamResponseNotification

# @login_required
# def admin_team_responses(request):

#     notifications = (
#         TeamResponseNotification.objects
#         .select_related("project", "member__user")
#         .order_by("-created_at")
#     )

#     grouped = {}

#     for n in notifications:
#         pid = n.project.id

#         if pid not in grouped:
#             grouped[pid] = {
#                 "project_code": f"AK-{pid}",
#                 "responses": [],
#                 "is_read": n.is_read,
#             }

#         grouped[pid]["responses"].append({
#             "id": n.id,
#             "member": n.member.user.get_full_name(),
#             "status": n.response_status,
#             "is_read": n.is_read
#         })

#     unread_count = notifications.filter(is_read=False).count()

#     return JsonResponse({
#         "projects": list(grouped.values()),
#         "unread_count": unread_count
#     })

from django.http import JsonResponse
from collections import defaultdict
from .models import TeamResponseNotification


def admin_team_responses(request):

    responses = TeamResponseNotification.objects.select_related(
        "project", "member__user"
    )
    from collections import defaultdict
    grouped = defaultdict(lambda: {
        "project_code": "",
        "client_name": "",
        "responses": []
    })

    for r in responses:
        project = r.project

        project_key = project.id  # group by project id

        grouped[project_key]["project_code"] = f"AK-{project.id}"
        grouped[project_key]["client_name"] = (
            project.lead.client_name if project.lead else project.client_name
        )

        grouped[project_key]["responses"].append({
            "member": r.member.user.get_full_name() or r.member.user.username,
            "role": r.member.role,
            "status": r.response_status,
            "is_read": r.is_read,
        })

    data = {
        "unread_count": responses.filter(is_read=False).count(),
        "projects": list(grouped.values())
    }

    return JsonResponse(data)
@login_required
def mark_project_read(request):
    code = request.POST.get("project_code")
    pid = code.replace("AK-", "")

    TeamResponseNotification.objects.filter(
        project_id=pid
    ).update(is_read=True)

    return JsonResponse({"success": True})


@login_required
def delete_project_responses(request):
    code = request.POST.get("project_code")
    pid = code.replace("AK-", "")

    TeamResponseNotification.objects.filter(
        project_id=pid
    ).delete()

    return JsonResponse({"success": True})


from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.shortcuts import get_object_or_404
from .models import Lead, Invoice, InvoiceItem

@require_POST
def auto_create_invoice_from_lead(request):
    """
    Called automatically when a lead is accepted from the Kanban board.
    Finds (or creates) a Project linked to the lead, then creates an Invoice.
    If no Project exists for this lead, creates a minimal one first.
    """
    lead_id = request.POST.get('lead_id')
    if not lead_id:
        return JsonResponse({'success': False, 'error': 'lead_id missing'}, status=400)

    try:
        lead = Lead.objects.get(id=lead_id)
    except Lead.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Lead not found'}, status=404)

    # ── Find or create a Project for this lead ──────────────────
    from .models import Project
    project, created = Project.objects.get_or_create(
        lead=lead,
        defaults={
            'client_name': lead.client_name,
            'status': 'ASSIGNED',
        }
    )

    # ── Avoid duplicate invoices ────────────────────────────────
    if Invoice.objects.filter(project=project).exists():
        existing = Invoice.objects.filter(project=project).first()
        return JsonResponse({
            'success': True,
            'invoice_id': existing.id,
            'already_existed': True
        })

    # ── Build invoice ───────────────────────────────────────────
    invoice = Invoice.objects.create(
        project=project,
        status='PENDING'     # directly PENDING since lead is accepted
    )

    services = lead.selected_services or []

    if services:
        for svc in services:
            InvoiceItem.objects.create(
                invoice=invoice,
                service_key=svc.get('key', 'PKG'),
                service_label=svc.get('label', 'Package'),
                members={
                    'crew': svc.get('crew', []),
                    'deliverables': svc.get('deliverables', [])
                },
                quantity=1,
                unit_price=float(svc.get('price', 0))
            )
    else:
        # No packages — create a single line from total_amount
        InvoiceItem.objects.create(
            invoice=invoice,
            service_key='TOTAL_PKG',
            service_label=f'{lead.event_type} Package',
            members={},
            quantity=1,
            unit_price=float(lead.total_amount or 0)
        )

    # ── Recalculate ──────────────────────────────────────────────
    pricing = lead.pricing_data or {}
    subtotal    = float(pricing.get('subtotal', lead.total_amount or 0))
    discount    = float(pricing.get('discountAmount', 0))
    gst_amount  = float(pricing.get('gstAmount', 0))
    final_total = float(pricing.get('finalTotal', lead.total_amount or subtotal))

    invoice.subtotal    = subtotal - discount    # after discount
    invoice.tax_amount  = gst_amount
    invoice.total       = final_total
    invoice.save()

    return JsonResponse({
        'success': True,
        'invoice_id': invoice.id,
        'project_id': project.id,
        'total': float(invoice.total),
        'created': True
    })
