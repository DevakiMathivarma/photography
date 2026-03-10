from django.contrib import admin
from django import forms
from django.contrib.auth.models import User
from .models import TeamMember


# ===============================
# CUSTOM ADMIN FORM
# ===============================
class TeamMemberAdminForm(forms.ModelForm):
    username = forms.CharField(label="Username")
    password = forms.CharField(
        widget=forms.PasswordInput,
        label="Temporary Password"
    )
    email = forms.EmailField(
        required=False,
        label="Email ID"
    )

    class Meta:
        model = TeamMember
        fields = ("role", "is_active")

    def save(self, commit=True):
        username = self.cleaned_data["username"]
        password = self.cleaned_data["password"]
        email = self.cleaned_data.get("email")

        # Auto-generate email if not provided
        if not email:
            email = f"{username}@akashphotography.com"

        # Create Django User
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            is_staff=False
        )

        # Create TeamMember profile
        team_member = super().save(commit=False)
        team_member.user = user

        if commit:
            team_member.save()

        return team_member


# ===============================
# ADMIN CONFIG
# ===============================
@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    form = TeamMemberAdminForm

    # Show User ID in list view
    list_display = ("user_id_display", "user", "role", "is_active")
    list_filter = ("role", "is_active")
    search_fields = ("user__username", "user__email")

    # Hide original user field
    exclude = ("user",)

    # Show User ID on edit page (read-only)
    readonly_fields = ("user_id_display",)

    def user_id_display(self, obj):
        """
        Display User ID safely.
        Available only after object is created.
        """
        if obj and obj.user:
            return obj.user.id
        return "-"
    user_id_display.short_description = "User ID"