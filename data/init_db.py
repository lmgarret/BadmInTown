import sqlite3, argparse, os, csv, pprint

db_file = 'badmintown.db'
sql_file = 'init_db.sql'

csv_tables = ['Tournament','Club','Location']

def delete_db():
    global db_file
    print("Deleting db file...")
    if os.path.isfile(db_file):
        os.remove(db_file)
    else:
        print("File does not exist")


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

def csv_to_db(table_name,test_mode=False):
    global db_file
    csv_file = ("test_" if test_mode else "" )+table_name +".csv"
    conn = sqlite3.connect(db_file)
    cur = conn.cursor()

    if not os.path.isfile(csv_file):
        print("File " + csv_file +" does not exist, aborting insertion for this one")
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

def load_csvs_to_db(test_mode):
    for table in csv_tables:
        print("================ "+table+" ================")
        csv_to_db(table,test_mode)
        print("================="+("=" * len(table))+"=================\n")


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
