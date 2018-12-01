const RANKS_NATIONAL = ["N", "N1", "N2", "N3", "N+", "N-"];
const RANKS_REGIONAL = ["R", "R4", "R5", "R6", "R+", "R-"];
const RANKS_DEPARTMENTAL = ["D", "D7", "D8", "D9", "D+", "D-"];
const RANKS_COMMUNAL = ["P", "P10", "P11", "P12", "P+", "P-"];
const RANKS_NONE = ["NC", "?"];

function _parseNumber(arg) {
    const varToString = varObj => Object.keys(varObj)[0]

    if (typeof arg === "number") {
        return arg;
    } else if (typeof arg === "string" && arg !== "") {
        return parseFloat(arg);
    } else {
        throw new TypeError(`${varToString(arg)} is not a parseable number: got ${typeof arg}`);
    }
}

class GraphicalDataPoint {
    constructor(data) {
        this.id = _parseNumber(data.id);
        this.name = data.name;
        this.lat = _parseNumber(data.lat);
        this.long = _parseNumber(data.long);
    }
}

class Club extends GraphicalDataPoint {
    constructor(data) {
        super(data);
        this.short_name = data.short_name;
        this.city_name = data.city_name;
        this.url = data.url;
        this.html = data.html;
        this.players = [];
        this.rank_N_count = 0;
        this.rank_R_count = 0;
        this.rank_D_count = 0;
        this.rank_P_count = 0;
        this.rank_NC_count = 0;
        this.rank_avg = 0;
    }

    getPlayers() {
        return this.players;
    }

    addPlayer(player) {
        this.players.push(player);

        this.updateRankCount(player, RANKS_NATIONAL, c => this.rank_N_count += c);
        this.updateRankCount(player, RANKS_REGIONAL, c => this.rank_R_count += c);
        this.updateRankCount(player, RANKS_DEPARTMENTAL, c => this.rank_D_count += c);
        this.updateRankCount(player, RANKS_COMMUNAL, c => this.rank_P_count += c);
        this.updateRankCount(player, RANKS_NONE, c => this.rank_NC_count += c);

        this.rank_avg = (this.rank_avg * (this.players.length - 1) + player.rank_avg) / this.players.length;
    }

    getPlayersCountRanked(rank) {
        switch (rank) {
            case "N":
                return this.rank_N_count;
            case "R":
                return this.rank_R_count;
            case "D":
                return this.rank_D_count;
            case "P":
                return this.rank_P_count;
            case "NC":
                return this.rank_NC_count;
            default:
                throw new Error(`unknown rank: ${rank}`);
        }
    }

    updateRankCount(player, ranks, callback) {
        let count = 0;
        if (ranks.includes(player.rank_solo)) {
            count++;
        }
        if (ranks.includes(player.rank_double)) {
            count++;
        }
        if (ranks.includes(player.rank_mixte)) {
            count++;
        }

        callback(count);
    }

    getRankAVG(){
        return this.rank_avg;
    }

    _getPlayersCountRanked(ranks) {
        let count = 0;
        for (let i = 0; i < this.players.length; i++) {
            let player = this.players[i];
            if (ranks.includes(player.rank_solo)) {
                count++;
            }
            if (ranks.includes(player.rank_double)) {
                count++;
            }
            if (ranks.includes(player.rank_mixte)) {
                count++;
            }

        }
        return count;
    }

}

class Tournament extends GraphicalDataPoint {
    constructor(data) {
        super(data);
        this.start_date = data.start_date;
        this.url = data.url;
        this.html = data.html;
        if (data.price_1_tab !== undefined && data.price_1_tab !== "") {
            this.price_1_tab = _parseNumber(data.price_1_tab);
        }
        if (data.price_2_tabs !== undefined && data.price_2_tabs !== "") {
            this.price_2_tabs = _parseNumber(data.price_2_tabs);
        }
        if (data.price_3_tabs !== undefined && data.price_3_tabs !== "") {
            this.price_3_tabs = _parseNumber(data.price_3_tabs);
        }
    }

}

class Player {
    constructor(data){
        this.license = _parseNumber(data.license);
        this.name = data.name;
        this.surname = data.surname;
        this.gender = data.gender;
        this.rank_solo = data.S;
        this.rank_double = data.D;
        this.rank_mixte = data.M;
        this.rank_avg = data.Moy;
        this.club_id = _parseNumber(data.club_id);
    }
}


function getNTopClubs(n, clubs, rank = "N") {
    if(rank === "avg"){
        return clubs.sort((club1, club2) => {
            return club1.getRankAVG() < club2.getRankAVG();
        }).slice(0,n);
    }else {
        return clubs.sort((club1, club2) => {
            return club1.getPlayersCountRanked(rank) < club2.getPlayersCountRanked(rank);
        }).slice(0,n);
    }
}

