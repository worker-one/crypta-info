import click
import asyncio

# Import the session factory and seeding functions
from .core.database import init_db, init_countries, AsyncSessionFactory
from ..scripts.init_fiat_currencies import seed_fiat_currencies
from ..scripts.init_static_pages import generate_static_pages


@click.group()
def cli():
    """Command line interface for the application."""
    pass

@cli.command("init-db")
@click.option("--force", is_flag=True, help="Force re-initialize the database.")
def init_database(force: bool):
    """Initialize the database."""
    if force:
        click.echo("Force re-initializing the database...")
    else:
        click.echo("Initializing the database...")

    # Call the function to initialize the database
    asyncio.run(init_db())
    click.echo("Database initialized successfully.")

@cli.command("init-db-countries")
@click.option("--force", is_flag=True, help="Force re-initialize the database.")
def init_database_countries(force: bool):
    """Initialize the database with countries."""
    asyncio.run(init_countries())
    click.echo("Countries initialized successfully.")

@cli.command("init-fiat-currencies")
def init_fiat():
    """Seed the database with initial fiat currencies."""
    click.echo("Seeding fiat currencies...")
    async def run_seed():
        async with AsyncSessionFactory() as session:
            await seed_fiat_currencies(session)
    asyncio.run(run_seed())
    click.echo("Fiat currencies seeded successfully.")

@cli.command("init-static-pages")
def init_pages():
    """Generate initial static pages in the database."""
    click.echo("Generating static pages...")
    async def run_generate():
        async with AsyncSessionFactory() as session:
            await generate_static_pages(session)
    asyncio.run(run_generate())
    click.echo("Static pages generated successfully.")

@cli.command("drop-db")
@click.option("--force", is_flag=True, help="Force drop the database without confirmation.")
def drop_database(force: bool):
    """Drop all tables in the database."""
    if not force:
        confirm = click.confirm("Are you sure you want to drop all tables in the database?", abort=True)
    click.echo("Dropping all tables in the database...")

    from .core.database import drop_db  # Make sure you have a drop_db function implemented

    asyncio.run(drop_db())
    click.echo("All tables dropped successfully.")


def entrypoint():
    """Entry point for the CLI."""
    cli()

if __name__ == "__main__":
    entrypoint()