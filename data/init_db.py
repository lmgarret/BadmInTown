import sqlite3, argparse, os, csv, pprint

# =============== GLOBAL PARAMETERS =============== #
# Path of the .db file to work on
db_file = 'badmintown.db'
# Path of the .sql used to init the db. See @init_db_file
sql_file = 'init_db.sql'

# List of all SQL tables that will have corresponding .csv files. See @csv_to_db
csv_tables = [
    'Tournament',
    'TournamentRanking',
    'TournamentCategory',
    'Club',
    'Player',
    'participates',
    'organizes',
    'accept_category',
    'accepts_ranking'
]

# =============== FUNCTIONS DEFINITION =============== #

'''
Deletes the .db file located @db_file
'''
def delete_db():
    global db_file
    print("Deleting db file...")
    if os.path.isfile(db_file):
        os.remove(db_file)
    else:
        print("File does not exist")

'''
Creates a new .db file @db_file by executing the sql queries located @sql_file.
User should delete the .db file using @delete_db if it exists!
'''
def init_db_file():
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

'''
Loads data located into a .csv file named "@table_name.csv" and stores it into the .db fileself.
The .csv file should respect the naming convention as done in the test_*.csv files.
@param table_name name of the sql table to file and of the csv file without its extension
@param test_mode if true, will append "test_" to the .csv filename to be used, so that we populate the db using test files
'''
def csv_to_db(table_name,test_mode=False):
    global db_file
    csv_file = ("test_" if test_mode else "" )+table_name +".csv"
    conn = sqlite3.connect(db_file)
    cur = conn.cursor()

    if not os.path.isfile(csv_file):
        print("File " + csv_file +" does not exist, aborting insertion for this one")
        return
    if not os.path.isfile(db_file):
        print("File " + db_file +" does not exist, please create it and populate using \"python init.py -i -c\"")
        return

    with open(csv_file,'r') as csv_file_o:
        print("Loading "+csv_file+" ...")
        dr = csv.DictReader(csv_file_o)
        csv_fields = dr.fieldnames
        to_db = []
        for row in dr:
            temp = []
            for field in csv_fields:
                temp.append(row[field])
            to_db.append(temp)

        pp = pprint.PrettyPrinter(indent=4)
        pp.pprint(csv_fields)
        pp.pprint(to_db)

        print("Inserting into table "+table_name+"...")
        qry_fields = "(" + ",".join(csv_fields) + ")"
        qry_qst_mark = "(" + ",".join([('?') for field in csv_fields]) + ")"
        cur.executemany("INSERT INTO " + table_name + " " + qry_fields + " VALUES " + qry_qst_mark, to_db)
        print("Insertion done!")
    conn.commit()
    cur.close()
    conn.close()

'''
Populates the database by loading all .csv files corresponding to tables enumerated in @csv_tables
@param test_mode see @csv_to_db method
'''
def load_csvs_to_db(test_mode=False):
    for table in csv_tables:
        print("================ "+table+" ================")
        csv_to_db(table,test_mode)
        print("================="+("=" * len(table))+"=================\n")

# =============== ARGUMENT PARSING AND PROGRAM LOGIC =============== #
parser = argparse.ArgumentParser(description='Creates and populates the BadmInTown database')
parser.add_argument('-d', "--delete", action='store_true',
                    help='Delete the .db file')

parser.add_argument('-i', "--init", action='store_true',
                    help='Create the .db file from the sql file')

parser.add_argument('-c', "--csv", action='store_true',
                    help='Populates the .db file using the .csv files')

parser.add_argument('-t', "--test_csv", action='store_true',
                    help='Populates the .db file using the test_*.csv files')
args = parser.parse_args()

if args.delete:
    delete_db()
if args.init:
    init_db_file()
if args.csv or args.test_csv:
    load_csvs_to_db(args.test_csv)
