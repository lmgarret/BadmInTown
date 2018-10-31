import sqlite3

sqlScript = open('init_db.sql', 'r').read()
conn = sqlite3.connect('badmintown.db')
cur = conn.cursor()
for statement in sqlScript.split(';'):
    cur.execute(statement)
conn.commit()
cur.close()
conn.close()
