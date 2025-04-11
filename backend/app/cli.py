"""Initialize the database.

This command initializes the database schema and creates necessary tables.
If --force flag is provided, it will drop existing tables before re-creating them.

Examples:
    # Initialize the database for the first time
    $ python -m app.cli init-db
    
    # Force re-initialize the database (drops existing tables)
    $ python -m app.cli init-db --force
"""
import click

from .core.database import init_db, init_countries

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
    import asyncio
    asyncio.run(init_db())
    click.echo("Database initialized successfully.")
    
@cli.command("init-db-countries")
@click.option("--force", is_flag=True, help="Force re-initialize the database.")
def init_database_countries(force: bool):
    import asyncio
    asyncio.run(init_countries())
    click.echo("Countries initialized successfully.")
    

def entrypoint():
    """Entry point for the CLI."""
    cli()

if __name__ == "__main__":
    entrypoint()