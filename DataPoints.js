const RANKS_NATIONAL = ["N", "N1", "N2", "N3", "N+", "N-"];
const RANKS_REGIONAL = ["R", "R4", "R5", "R6", "R+", "R-"];
const RANKS_DEPARTMENTAL = ["D", "D7", "D8", "D9", "D+", "D-"];
const RANKS_COMMUNAL = ["P", "P10", "P11", "P12", "P+", "P-"];
const RANKS_NONE = ["NC", "?"];

class GraphicalDataPoint {
    constructor(data) {
        this.id = this._parseNumber(data.id);
        this.name = data.name;
        this.lat = this._parseNumber(data.lat);
        this.long = this._parseNumber(data.long);
    }

    _parseNumber(arg) {
        const varToString = varObj => Object.keys(varObj)[0]

        if (typeof arg === "number") {
            return arg;
        } else if (typeof arg === "string" && arg !== "") {
            return parseFloat(arg);
        } else {
            throw new TypeError(`${varToString(arg)} is not a parseable number: got ${typeof arg}`);
        }
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
    }

    getPlayers() {
        return this.players;
    }

    addPlayer(player) {
        this.players.push(player);
    }

    getPlayersCountRanked(rank) {
        switch (rank) {
            case "N":
                return this._getPlayersCountRanked(RANKS_NATIONAL);
            case "R":
                return this._getPlayersCountRanked(RANKS_REGIONAL);
            case "D":
                return this._getPlayersCountRanked(RANKS_DEPARTMENTAL);
            case "P":
                return this._getPlayersCountRanked(RANKS_COMMUNAL);
            case "NC":
                return this._getPlayersCountRanked(RANKS_NONE);
            default:
                throw new Error(`unknown rank: ${rank}`);
        }
    }

    _getPlayersCountRanked(ranks) {
        let count = 0;
        for (let i = 0; i < this.players.length; i++) {
            let player = this.players[i];
            if (ranks.includes(player.S)) {
                count++;
            }
            if (ranks.includes(player.D)) {
                count++;
            }
            if (ranks.includes(player.M)) {
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
            this.price_1_tab = this._parseNumber(data.price_1_tab);
        }
        if (data.price_2_tabs !== undefined && data.price_2_tabs !== "") {
            this.price_2_tabs = this._parseNumber(data.price_2_tabs);
        }
        if (data.price_3_tabs !== undefined && data.price_3_tabs !== "") {
            this.price_3_tabs = this._parseNumber(data.price_3_tabs);
        }
    }

}

class Player {
}

class Rank {

}
