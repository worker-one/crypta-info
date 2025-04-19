# --- Page Definitions ---
PAGES_DATA = {
    "privacy": {
        "title": "Privacy Policy",
        "content": """
        <h1>Privacy Policy</h1>
        <p>Last updated: April 18, 2025</p>
        <p>Your privacy is important to us. It is [Your Company Name]'s policy to respect your privacy regarding any information we may collect from you across our website, [Your Website URL], and other sites we own and operate.</p>
        <h2>1. Information We Collect</h2>
        <p>Log data: ...</p>
        <p>Cookies: ...</p>
        <p>Personal Information: ...</p>
        <h2>2. How We Use Information</h2>
        <p>We use the information we collect in various ways, including to:</p>
        <ul>
            <li>Provide, operate, and maintain our website</li>
            <li>Improve, personalize, and expand our website</li>
            <li>Understand and analyze how you use our website</li>
            <li>Develop new products, services, features, and functionality</li>
            <li>Communicate with you, either directly or through one of our partners...</li>
        </ul>
        <h2>3. Log Files</h2>
        <p>[Your Company Name] follows a standard procedure of using log files...</p>
        <h2>4. Cookies and Web Beacons</h2>
        <p>Like any other website, [Your Company Name] uses 'cookies'...</p>
        <h2>5. GDPR Data Protection Rights</h2>
        <p>We would like to make sure you are fully aware of all of your data protection rights...</p>
        <h2>6. Children's Information</h2>
        <p>Another part of our priority is adding protection for children while using the internet...</p>
        <h2>7. Changes to This Privacy Policy</h2>
        <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
        <h2>8. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us: ...</p>
        """
    },
    "terms": {
        "title": "Terms of Service",
        "content": """
        <h1>Terms of Service</h1>
        <p>Last updated: April 18, 2025</p>
        <p>Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the [Your Website URL] website (the "Service") operated by [Your Company Name] ("us", "we", or "our").</p>
        <h2>1. Agreement to Terms</h2>
        <p>By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.</p>
        <h2>2. Accounts</h2>
        <p>When you create an account with us, you must provide us information that is accurate, complete, and current at all times...</p>
        <h2>3. Intellectual Property</h2>
        <p>The Service and its original content, features and functionality are and will remain the exclusive property of [Your Company Name] and its licensors...</p>
        <h2>4. Links To Other Web Sites</h2>
        <p>Our Service may contain links to third-party web sites or services that are not owned or controlled by [Your Company Name]...</p>
        <h2>5. Termination</h2>
        <p>We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever...</p>
        <h2>6. Limitation Of Liability</h2>
        <p>In no event shall [Your Company Name], nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages...</p>
        <h2>7. Governing Law</h2>
        <p>These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.</p>
        <h2>8. Changes</h2>
        <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time...</p>
        <h2>9. Contact Us</h2>
        <p>If you have any questions about these Terms, please contact us: ...</p>
        """
    },
    "about": {
        "title": "About Us",
        "content": """
        <h1>About Us</h1>
        <p>Welcome to [Your Company/Website Name]!</p>
        <p>We are dedicated to providing [briefly describe your mission or purpose]. Our platform offers [mention key features or services].</p>
        <h2>Our Mission</h2>
        <p>[Elaborate on your mission and values].</p>
        <h2>Our Team</h2>
        <p>[Optionally, introduce your team or talk about the expertise behind the project].</p>
        <p>Thank you for visiting us. We hope you find our service valuable.</p>
        """
    },
    "faq": {
        "title": "Frequently Asked Questions (FAQ)",
        "content": """
        <h1>Frequently Asked Questions</h1>
        <h2>General Questions</h2>
        <dl>
          <dt><strong>Q: What is [Your Website Name]?</strong></dt>
          <dd>A: [Your Website Name] is a platform for [brief description].</dd>
          <dt><strong>Q: How do I get started?</strong></dt>
          <dd>A: Simply [explain the first step, e.g., sign up, browse content].</dd>
          <dt><strong>Q: Is there a cost to use the service?</strong></dt>
          <dd>A: [Explain your pricing model - e.g., free, subscription, freemium].</dd>
        </dl>
        <h2>Account Questions</h2>
        <dl>
          <dt><strong>Q: How do I reset my password?</strong></dt>
          <dd>A: You can reset your password by clicking the 'Forgot Password' link on the login page.</dd>
          <dt><strong>Q: How can I delete my account?</strong></dt>
          <dd>A: Please contact support at [your support email] to request account deletion.</dd>
        </dl>
        <h2>Technical Questions</h2>
        <dl>
          <dt><strong>Q: What browsers are supported?</strong></dt>
          <dd>A: We support the latest versions of Chrome, Firefox, Safari, and Edge.</dd>
        </dl>
        <p>If you have other questions, feel free to <a href="/static-page.html?slug=contacts">contact us</a>.</p>
        """
    },
    "contacts": {
        "title": "Contact Us",
        "content": """
        <h1>Contact Us</h1>
        <p>We'd love to hear from you! Whether you have a question about features, trials, pricing, need a demo, or anything else, our team is ready to answer all your questions.</p>
        <h2>Get in Touch</h2>
        <ul>
            <li><strong>Email:</strong> <a href="mailto:support@[yourdomain.com]">support@[yourdomain.com]</a></li>
            <li><strong>Address:</strong> [Your Company Address, if applicable]</li>
            <li><strong>Phone:</strong> [Your Phone Number, if applicable]</li>
        </ul>
        <p>You can also reach out through our social media channels:</p>
        <ul>
            <li>[Link to Twitter/X]</li>
            <li>[Link to LinkedIn]</li>
            <li>[Link to Facebook]</li>
        </ul>
        <p>Alternatively, fill out the contact form below:</p>
        <!-- Add a placeholder or link to a contact form if you have one -->
        <p>[Contact Form Placeholder]</p>
        """
    }
}

import os
import sys
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession # Import AsyncSession
from sqlalchemy import select # Import select for queries
from app.core.database import AsyncSessionFactory

# Add the project root to the Python path
# Consider if this is the best approach for your project structure
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')) # Adjusted path assuming script is in backend/scripts
if project_root not in sys.path:
    sys.path.insert(0, project_root)


# Import your Base and StaticPage model
# Adjust the import path based on your project structure
try:
    from app.models.static_page import StaticPage
except ImportError:
    print("Error: Could not import StaticPage model. Check PYTHONPATH and project structure.")
    sys.exit(1)

# Remove synchronous sessionmaker and engine import if not needed elsewhere
# from sqlalchemy.orm import sessionmaker
# from app.core.database import engine # Assuming you have a session setup like this
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


async def generate_static_pages(session: AsyncSession): # Type hint session
    try:
        print("Starting static page generation...")
        for slug, data in PAGES_DATA.items():
            # Check if page already exists using async query
            stmt = select(StaticPage).where(StaticPage.slug == slug)
            result = await session.execute(stmt)
            existing_page = result.scalar_one_or_none() # Use scalar_one_or_none()

            if existing_page:
                print(f"Page with slug '{slug}' already exists. Skipping.")
                # Optionally, update existing pages:
                # print(f"Updating page with slug '{slug}'...")
                # existing_page.title = data["title"]
                # existing_page.content = data["content"].strip()
                # session.add(existing_page) # No await needed for add
            else:
                print(f"Creating page with slug '{slug}'...")
                new_page = StaticPage(
                    slug=slug,
                    title=data["title"],
                    content=data["content"].strip()
                    # last_updated_by_user_id could be set if you have a default admin user ID
                )
                session.add(new_page) # No await needed for add

        await session.commit() # Use await for commit
        print("Static page generation completed successfully.")
    except Exception as e:
        await session.rollback() # Use await for rollback
        print(f"An error occurred: {e}")
    # No need for session.close() when using 'async with'


async def main():
    """Initializes database and runs the seeding function."""
    print("Attempting to connect to database and generate pages...")
    try:
        async with AsyncSessionFactory() as session:
            await generate_static_pages(session)
    except Exception as e:
        print(f"Failed to run main function: {e}")
        # Add more specific error handling if needed (e.g., connection errors)

if __name__ == "__main__":
    print("Please ensure placeholders in PAGES_DATA are filled before running.")
    asyncio.run(main())