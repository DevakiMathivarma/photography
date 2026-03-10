from django.db import models
from django.contrib.auth.models import User

class Lead(models.Model):

    STATUS_CHOICES = [
        ("NEW", "New"),
        ("FOLLOW_UP", "Follow Up"),
        ("ACCEPTED", "Accepted"),
        ("LOST", "Lost"),
    ]

    # CLIENT DETAILS
    client_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    email = models.EmailField(blank=True, null=True)
    position = models.PositiveIntegerField(default=0)

    # EVENT DETAILS
# EVENT DETAILS
    event_type = models.CharField(max_length=50)

    event_start_date = models.DateField()
    event_start_session = models.CharField(
    max_length=10,
    choices=[("Morning", "Morning"), ("Evening", "Evening")]
)

    event_end_date = models.DateField()
    event_end_session = models.CharField(
    max_length=10,
    choices=[("Morning", "Morning"), ("Evening", "Evening")]
)

    follow_up_date = models.DateField(null=True, blank=True)

    event_location = models.CharField(max_length=150)


    # PAYMENT (ONLY FILLED WHEN ACCEPTED)
    total_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    paid_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="NEW"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    selected_services = models.JSONField(default=list)
    pricing_data = models.JSONField(default=dict, blank=True, null=True)

    def __str__(self):
        return self.client_name


# projects
from django.db import models

class Project(models.Model):
    STATUS_CHOICES = [
        ("ASSIGNED", "To Be Assigned"),
        ("PRE", "Pre Production"),
        ("SELECTION", "Selection"),
        ("POST", "Post Production"),
        ("COMPLETED", "Completed"),
    ]

    lead = models.OneToOneField(
        "Lead",
        on_delete=models.CASCADE,
        related_name="project"
    )

    client_name = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    event_type = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    start_date = models.DateField(
        blank=True,
        null=True
    )

    end_date = models.DateField(
        blank=True,
        null=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="ASSIGNED"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.client_name or f"Project #{self.id}"


# Team member
class TeamMember(models.Model):

    ROLE_CHOICES = [
        ("PHOTOGRAPHER", "Photographer"),
        ("VIDEOGRAPHER", "Videographer"),
        ("EDITOR", "Editor"),
        ("ASSISTANT", "Assistant"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="team_profile"
    )

    role = models.CharField(max_length=30, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} ({self.role})"


class ProjectTeam(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="team_assignments"
    )
    member = models.ForeignKey(
        TeamMember,
        on_delete=models.CASCADE
    )

    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "member")

    def __str__(self):
        return f"{self.member.name} → {self.project}"


class ProjectTask(models.Model):
    PHASE_CHOICES = [
        ("PLANNING", "Planning & Coordination"),
        ("HARD_DISK", "Hard Disk Collection"),
        ("PRE_WEDDING", "Pre Wedding Shoot"),
        ("MAIN", "Main Coverage Phase"),
         ("SELECTION", "Selection Phase"),
          ("POST", "Post Production"),  
    ]
    STATUS_CHOICES = [
        ("OPEN", "Open"),
        ("ON_HOLD", "On Hold"),
        ("COMPLETED", "Completed"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="tasks"
    )
    
    phase = models.CharField(
        max_length=30,
        choices=PHASE_CHOICES
    )

    title = models.CharField(max_length=150)
    
    description = models.TextField(blank=True, null=True)

    assigned_to = models.ForeignKey(
        TeamMember,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    start_date = models.DateField(null=True, blank=True)

    due_date = models.DateField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="OPEN"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


from django.db import models
from .models import Project   # adjust import if needed

class Invoice(models.Model):
    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
         ("PENDING", "Pending"),
    ("COMPLETED", "Completed"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="invoices"
    )

    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="DRAFT"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Invoice #{self.id} - {self.project}"


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="items"
    )

    service_key = models.CharField(max_length=100)
    service_label = models.CharField(max_length=150)
    members = models.JSONField(default=dict, blank=True)

    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.amount = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.service_label} x {self.quantity}"


# for notification 
from django.db import models
from django.contrib.auth.models import User
from core.models import Project, TeamMember

class ProjectNotification(models.Model):
    STATUS_CHOICES = (
        ("PENDING", "Pending"),
        ("ACCEPTED", "Accepted"),
        ("REJECTED", "Rejected"),
    )

    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    member = models.ForeignKey(TeamMember, on_delete=models.CASCADE)

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="PENDING"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "member")  # 🔥 avoid duplicates


# team response
from django.db import models
from django.conf import settings


class TeamResponseNotification(models.Model):

    STATUS_CHOICES = [
        ("ACCEPTED", "Accepted"),
        ("REJECTED", "Rejected"),
    ]

    project = models.ForeignKey(
        "Project",
        on_delete=models.CASCADE,
        related_name="team_responses"
    )

    
    member = models.ForeignKey(
        TeamMember,
        on_delete=models.CASCADE,
        related_name="response_notifications"
    )



    response_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES
    )

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Team Response Notification"
        verbose_name_plural = "Team Response Notifications"

    def __str__(self):
        return f"{self.project} - {self.member} - {self.response_status}"