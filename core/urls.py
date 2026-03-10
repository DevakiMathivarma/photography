from django.urls import path
from . import views
from .views import (
    login_view,

    # Leads
    leads_view,
    save_lead,
    update_lead_status,
    get_lead,

    # Projects
    projects_view,
    update_project_status,
    assign_team_members,
    assign_project_tasks,

    # Follow-ups
    followup_panel_data,
    mark_followup_done,

    # team member
     team_members_view, create_team_member,project_details_api,
    #  task assigning
    project_tasks_api,add_project_task,update_position,update_project_task,delete_project_task,
    # sessionpage
    sessions_view,
    # invoice
    project_invoice_view,create_invoice,add_invoice_item,update_item_qty,delete_invoice_item,apply_tax,generate_invoice,update_invoice_status,edit_invoice_data,
    # team
    team_dashboard
    
)

urlpatterns = [

    # ==========================
    # AUTH
    # ==========================
    path("", login_view, name="home"),
    path("login/", login_view, name="login"),

    # ==========================
    # LEADS
    # ==========================
    path("leads/", leads_view, name="leads"),
    path("leads/save/", save_lead, name="save_lead"),
    path("leads/update-status/", update_lead_status, name="update_lead_status"),
    path("leads/get/<int:lead_id>/", get_lead, name="get_lead"),
    path("update-position/", update_position, name="update_position"),


    # ==========================
    # PROJECTS
    # ==========================
    path("projects/", projects_view, name="projects"),
    path("projects/update-status/", update_project_status, name="update_project_status"),

    # 🔽 Popups (Team + Tasks)
    path("projects/assign-team/", assign_team_members, name="assign_team_members"),
    path("projects/assign-tasks/", assign_project_tasks, name="assign_project_tasks"),

    # ==========================
    # FOLLOW-UP REMINDERS
    # ==========================
    path("followups/data/", followup_panel_data, name="followup_panel_data"),
    path("followups/done/", mark_followup_done, name="mark_followup_done"),
     path("team-members/", team_members_view, name="team_members"),
    path("team-members/create/", create_team_member, name="create_team_member"),
    path(
    "projects/details/<int:project_id>/",
    project_details_api,
    name="project_details_api"
),
 path("projects/<int:project_id>/tasks/", project_tasks_api),
    path("projects/tasks/add/", add_project_task),
    path("projects/tasks/update/", update_project_task),
    path("projects/tasks/delete/", delete_project_task),

    # sessions page
    path("sessions/", sessions_view, name="sessions"),
    # invoice
     path("project-invoice/", project_invoice_view, name="project_invoice"),
    path("invoice/create/", create_invoice, name="create_invoice"),
    path("invoice/add-item/", add_invoice_item, name="add_invoice_item"),
    path("invoice/update-qty/",update_item_qty, name="update_item_qty"),
    path("invoice/delete-item/", delete_invoice_item, name="delete_invoice_item"),
    path("invoice/apply-tax/", apply_tax, name="apply_tax"),
    path("invoice/generate/", generate_invoice, name="generate_invoice"),
     path("invoice/preview/<int:invoice_id>/", views.preview_invoice, name="preview_invoice"),
path(
    "invoice/download/<int:invoice_id>/",
    views.download_invoice,
    name="download_invoice"
),
path("invoice/update-status/", update_invoice_status, name="update_invoice_status"),
path("invoice/edit/<int:invoice_id>/", edit_invoice_data),
# team
path("team/dashboard/", team_dashboard, name="team_dashboard"),
 path("team/notifications/count/", views.team_notification_count, name="team_notification_count"),
    path("team/notifications/", views.team_notifications_api, name="team_notifications_api"),
    path("team/notifications/accept/", views.accept_notification, name="accept_notification"),
    path("team/notifications/reject/", views.reject_notification, name="reject_notification"),

    # 📅 Calendar
    path("team/calendar/", views.team_calendar_api, name="team_calendar_api"),
    # team response in admin
   path("team-responses/", views.admin_team_responses, name="admin_team_responses"),
path("team-responses/mark-read/", views.mark_project_read, name="mark_project_read"),
path("team-responses/delete/", views.delete_project_responses, name="delete_project_responses"),
path("team/project-overview/", views.team_project_overview_api),
 path('invoice/auto-create-from-lead/', views.auto_create_invoice_from_lead,
       name='auto_create_invoice_from_lead'),


]
