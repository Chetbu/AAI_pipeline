"""CLI entry point for the AAI pipeline."""

import argparse


def cmd_serve(args):
    import uvicorn
    uvicorn.run(
        "aai_pipeline.api.app:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )


def cmd_reset_db(args):
    from aai_pipeline.database import reset_db, DB_PATH
    answer = input(f"This will wipe all data in {DB_PATH}. Type 'yes' to confirm: ")
    if answer.strip().lower() != "yes":
        print("Aborted.")
        return
    reset_db()
    print("Database reset complete.")


def main():
    parser = argparse.ArgumentParser(prog="aai-pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    p_serve = sub.add_parser("serve", help="Start the API + frontend server")
    p_serve.add_argument("--host", default="0.0.0.0")
    p_serve.add_argument("--port", type=int, default=8742)
    p_serve.add_argument("--reload", action="store_true")
    p_serve.set_defaults(func=cmd_serve)

    p_reset = sub.add_parser("reset-db", help="Drop and recreate all tables (wipes all data)")
    p_reset.set_defaults(func=cmd_reset_db)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
