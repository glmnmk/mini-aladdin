import wrds
import pandas as pd

def test_connection():
    try:
        print("Connecting to WRDS (username: glmnm)...")
        # Initialize connection with the correct username explicitly
        db = wrds.Connection(wrds_username='glmnm')
        
        print("\nConnection successful!")
        print("Fetching sample data from CRSP (Daily Stock File)...")
        # Query Apple (PERMNO 14593) data for the last month
        sql = """
        SELECT date, prc, ret, vol
        FROM crsp.dsf
        WHERE permno = 14593
        AND date >= '2024-01-01'
        LIMIT 5
        """
        
        data = db.raw_sql(sql)
        print("CRSP Data Sample:")
        print(data)
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_connection()
