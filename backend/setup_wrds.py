import wrds

def setup():
    print("Setting up WRDS authentication...")
    print("This will securely store your credentials in ~/.pgpass")
    
    try:
        # Prompt for credentials and create the pgpass file
        db = wrds.Connection()
        db.create_pgpass_file()
        print("\nSuccess! Your credentials have been securely stored.")
        print("You can now connect to WRDS effortlessly.")
    except Exception as e:
        print(f"\nError setting up WRDS: {e}")

if __name__ == "__main__":
    setup()
