import sqlite3
import argparse
import os

db_file = 'badmintown.db'
sql_file = 'init_db.sql'

def delete_db():
    global db_file
    print("Deleting db file...")
    if os.path.isfile(db_file):
        os.remove(db_file)
    else:
        print("File does not exist")


def create_db():
    global db_file, sql_file
    print("Loading sql file...")
    sqlScript = open(sql_file, 'r').read()
    conn = sqlite3.connect(db_file)
    cur = conn.cursor()
    for statement in sqlScript.split(';'):
        cur.execute(statement)
    conn.commit()
    cur.close()
    conn.close()
    print("DB created!")

parser = argparse.ArgumentParser(description='Creates and populates the BadmInTown database')
parser.add_argument('-d', "--delete", action='store_true',
                    help='Delete the .db file')

parser.add_argument('-c', "--create", action='store_true',
                    help='Create the .db file from the sql file')
args = parser.parse_args()

if args.delete:
    delete_db()
if args.create:
    create_db()
