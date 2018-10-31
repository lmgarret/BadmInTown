CREATE TABLE Tournament (
	id integer PRIMARY KEY AUTOINCREMENT,
	name text,
	start_date date,
	url text,
	lat integer,
	long integer,
	price_1_tab integer,
	price_2_tabs integer,
	price_3_tabs integer

);
CREATE TABLE Location (
	id integer PRIMARY KEY AUTOINCREMENT,
	latitude float,
	longitude float
);

CREATE TABLE TournamentRanking (
	id integer PRIMARY KEY AUTOINCREMENT,
	name text,
	short_name text
);

CREATE TABLE TournamentCategory (
	id integer PRIMARY KEY AUTOINCREMENT,
	name text,
	short_name text
);

CREATE TABLE Club (
	id integer PRIMARY KEY AUTOINCREMENT,
	name text,
	short_name text,
	city_name text,
	lat integer,
	long integer,
	url text
);

CREATE TABLE Player (
	license integer PRIMARY KEY AUTOINCREMENT,
	name text,
	surname text,
	gender binary
);

CREATE TABLE organizes (
	tid integer,
	cid integer,
	PRIMARY KEY(tid,cid)
);

CREATE TABLE accepts_ranking (
	tid integer,
	trid integer,
	PRIMARY KEY(tid,trid)
);

CREATE TABLE accept_category (
	tid integer,
	tcid integer,
	PRIMARY KEY(tid,tcid)
);

CREATE TABLE participates (
	pid integer,
	tid integer,
	PRIMARY KEY(pid,tid)
);
