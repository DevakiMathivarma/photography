# ================================================================
# core/management/commands/seed_crew.py
# Run with: python manage.py seed_crew
# ================================================================

from django.core.management.base import BaseCommand
from core.models import CrewMember
from datetime import date


CREW_DATA = [
    # ── Traditional Photographers (TP) ──────────────────────────
    {"name": "Arjun Sharma",      "role": "TP", "priority": 1, "phone": "9876543201", "email": "arjun.sharma@akphoto.in"},
    {"name": "Karthik Reddy",     "role": "TP", "priority": 2, "phone": "9876543202", "email": "karthik.reddy@akphoto.in"},
    {"name": "Suresh Babu",       "role": "TP", "priority": 3, "phone": "9876543203", "email": "suresh.babu@akphoto.in"},
    {"name": "Dinesh Kumar",      "role": "TP", "priority": 4, "phone": "9876543204", "email": "dinesh.kumar@akphoto.in"},
    {"name": "Mohan Raj",         "role": "TP", "priority": 5, "phone": "9876543205", "email": "mohan.raj@akphoto.in"},
    {"name": "Venkat Rao",        "role": "TP", "priority": 6, "phone": "9876543206", "email": "venkat.rao@akphoto.in"},

    # ── Candid Photographers (CP) ────────────────────────────────
    {"name": "Priya Nair",        "role": "CP", "priority": 1, "phone": "9876543211", "email": "priya.nair@akphoto.in"},
    {"name": "Ananya Krishnan",   "role": "CP", "priority": 2, "phone": "9876543212", "email": "ananya.k@akphoto.in"},
    {"name": "Ravi Chandran",     "role": "CP", "priority": 3, "phone": "9876543213", "email": "ravi.chandran@akphoto.in"},
    {"name": "Deepika Menon",     "role": "CP", "priority": 4, "phone": "9876543214", "email": "deepika.menon@akphoto.in"},
    {"name": "Arun Pillai",       "role": "CP", "priority": 5, "phone": "9876543215", "email": "arun.pillai@akphoto.in"},
    {"name": "Kavya Sundar",      "role": "CP", "priority": 6, "phone": "9876543216", "email": "kavya.sundar@akphoto.in"},

    # ── Traditional Videographers (TV) ──────────────────────────
    {"name": "Sanjay Verma",      "role": "TV", "priority": 1, "phone": "9876543221", "email": "sanjay.verma@akphoto.in"},
    {"name": "Rahul Mehta",       "role": "TV", "priority": 2, "phone": "9876543222", "email": "rahul.mehta@akphoto.in"},
    {"name": "Nikhil Joshi",      "role": "TV", "priority": 3, "phone": "9876543223", "email": "nikhil.joshi@akphoto.in"},
    {"name": "Prakash Iyer",      "role": "TV", "priority": 4, "phone": "9876543224", "email": "prakash.iyer@akphoto.in"},
    {"name": "Ganesh Murthy",     "role": "TV", "priority": 5, "phone": "9876543225", "email": "ganesh.murthy@akphoto.in"},
    {"name": "Vijay Anand",       "role": "TV", "priority": 6, "phone": "9876543226", "email": "vijay.anand@akphoto.in"},

    # ── Candid Videographers (CV) ────────────────────────────────
    {"name": "Meera Iyer",        "role": "CV", "priority": 1, "phone": "9876543231", "email": "meera.iyer@akphoto.in"},
    {"name": "Lakshmi Priya",     "role": "CV", "priority": 2, "phone": "9876543232", "email": "lakshmi.priya@akphoto.in"},
    {"name": "Harish Nambiar",    "role": "CV", "priority": 3, "phone": "9876543233", "email": "harish.nambiar@akphoto.in"},
    {"name": "Sowmya Rajan",      "role": "CV", "priority": 4, "phone": "9876543234", "email": "sowmya.rajan@akphoto.in"},
    {"name": "Balu Krishna",      "role": "CV", "priority": 5, "phone": "9876543235", "email": "balu.krishna@akphoto.in"},
    {"name": "Divya Suresh",      "role": "CV", "priority": 6, "phone": "9876543236", "email": "divya.suresh@akphoto.in"},

    # ── Cinematic Videographers (CI) ─────────────────────────────
    {"name": "Pitta Sai",         "role": "CI", "priority": 1, "phone": "9876543241", "email": "pitta.sai@akphoto.in"},
    {"name": "Ramesh Babu",       "role": "CI", "priority": 2, "phone": "9876543242", "email": "ramesh.babu@akphoto.in"},
    {"name": "Chandra Sekhar",    "role": "CI", "priority": 3, "phone": "9876543243", "email": "chandra.s@akphoto.in"},
    {"name": "Aditya Rajan",      "role": "CI", "priority": 4, "phone": "9876543244", "email": "aditya.rajan@akphoto.in"},
    {"name": "Naveen Kumar",      "role": "CI", "priority": 5, "phone": "9876543245", "email": "naveen.kumar@akphoto.in"},

    # ── Drone Operators (DR) ─────────────────────────────────────
    {"name": "Ajay Drones",       "role": "DR", "priority": 1, "phone": "9876543251", "email": "ajay.drones@akphoto.in"},
    {"name": "Sunil Aerial",      "role": "DR", "priority": 2, "phone": "9876543252", "email": "sunil.aerial@akphoto.in"},
    {"name": "Praveen Sky",       "role": "DR", "priority": 3, "phone": "9876543253", "email": "praveen.sky@akphoto.in"},
    {"name": "Kiran Reddy",       "role": "DR", "priority": 4, "phone": "9876543254", "email": "kiran.reddy@akphoto.in"},

    # ── General Photographers (PH) ───────────────────────────────
    {"name": "Santosh Kumar",     "role": "PH", "priority": 1, "phone": "9876543261", "email": "santosh.k@akphoto.in"},
    {"name": "Manoj Yadav",       "role": "PH", "priority": 2, "phone": "9876543262", "email": "manoj.yadav@akphoto.in"},
    {"name": "Rajesh Naidu",      "role": "PH", "priority": 3, "phone": "9876543263", "email": "rajesh.naidu@akphoto.in"},
    {"name": "Varun Teja",        "role": "PH", "priority": 4, "phone": "9876543264", "email": "varun.teja@akphoto.in"},
    {"name": "Surya Prakash",     "role": "PH", "priority": 5, "phone": "9876543265", "email": "surya.p@akphoto.in"},
    {"name": "Bharath Kumar",     "role": "PH", "priority": 6, "phone": "9876543266", "email": "bharath.k@akphoto.in"},

    # ── General Videographers (VG) ───────────────────────────────
    {"name": "Satish Reddy",      "role": "VG", "priority": 1, "phone": "9876543271", "email": "satish.reddy@akphoto.in"},
    {"name": "Ashok Kumar",       "role": "VG", "priority": 2, "phone": "9876543272", "email": "ashok.kumar@akphoto.in"},
    {"name": "Naresh Babu",       "role": "VG", "priority": 3, "phone": "9876543273", "email": "naresh.babu@akphoto.in"},
    {"name": "Pavan Kalyan",      "role": "VG", "priority": 4, "phone": "9876543274", "email": "pavan.kalyan@akphoto.in"},
    {"name": "Tarun Kumar",       "role": "VG", "priority": 5, "phone": "9876543275", "email": "tarun.kumar@akphoto.in"},
    {"name": "Vinod Reddy",       "role": "VG", "priority": 6, "phone": "9876543276", "email": "vinod.reddy@akphoto.in"},

    # ── Extra buffer members (multi-role capable) ────────────────
    {"name": "Gopal Krishna",     "role": "TP", "priority": 7, "phone": "9876543281", "email": "gopal.k@akphoto.in"},
    {"name": "Hemanth Rao",       "role": "CP", "priority": 7, "phone": "9876543282", "email": "hemanth.rao@akphoto.in"},
    {"name": "Iswar Reddy",       "role": "TV", "priority": 7, "phone": "9876543283", "email": "iswar.r@akphoto.in"},
    {"name": "Jagadish Babu",     "role": "CV", "priority": 7, "phone": "9876543284", "email": "jagadish.b@akphoto.in"},
    {"name": "Keerthi Kumar",     "role": "CI", "priority": 6, "phone": "9876543285", "email": "keerthi.k@akphoto.in"},
    {"name": "Lokesh Varma",      "role": "PH", "priority": 7, "phone": "9876543286", "email": "lokesh.v@akphoto.in"},
    {"name": "Mahesh Babu",       "role": "VG", "priority": 7, "phone": "9876543287", "email": "mahesh.b@akphoto.in"},
    {"name": "Nithin Reddy",      "role": "DR", "priority": 5, "phone": "9876543288", "email": "nithin.r@akphoto.in"},
]


class Command(BaseCommand):
    help = 'Seed 50 crew members into the database'

    def handle(self, *args, **kwargs):
        created = 0
        skipped = 0

        for data in CREW_DATA:
            obj, was_created = CrewMember.objects.get_or_create(
                email=data['email'],
                defaults={
                    'name':     data['name'],
                    'role':     data['role'],
                    'priority': data['priority'],
                    'phone':    data['phone'],
                    'is_active': True,
                }
            )
            if was_created:
                created += 1
            else:
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Done. Created: {created}, Already existed: {skipped}'
            )
        )