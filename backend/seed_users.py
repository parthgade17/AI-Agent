"""
Create the staff accounts. Run once after schema.sql:
    python seed_users.py

Staff accounts are seeded here rather than self-registered, so nobody can
sign up as HOD from the browser. Change these passwords before any real use.
"""
import db
import auth

STAFF = [
    ("Dr. Mahendra Gawali", "hod@sanjivani.edu.in", "9876543210", "hod12345", "admin"),
    ("Demo Teacher", "teacher@sanjivani.edu.in", "9876543211", "teacher12345", "faculty"),
    ("Demo Student", "student@sanjivani.edu.in", "9876543212", "student12345", "student"),
]


def main():
    db.check_connection()
    for name, email, mobile, password, role in STAFF:
        if db.query_one("SELECT 1 FROM users WHERE lower(email) = lower(%s)", (email,)):
            print(f"  exists   {email}")
            continue
        db.execute(
            """INSERT INTO users (name, email, mobile, password_hash, role)
               VALUES (%s, %s, %s, %s, %s)""",
            (name, email, mobile, auth.hash_password(password), role),
        )
        print(f"  created  {email:32s} role={role}")
    print("\nDone. Sign in with the email addresses above.")


if __name__ == "__main__":
    main()
