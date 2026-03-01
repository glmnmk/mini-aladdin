import wrds

def list_access():
    try:
        db = wrds.Connection(wrds_username='glmnm')
        libs = db.list_libraries()
        print("Libraries you have access to:")
        print(libs)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_access()
