const fs = require("fs");
const axios = require("axios");
const { once } = require("events");
const now = new Date();
const OUTPUT_FILE = `./${now.toISOString()}-fifa-data.json`;
const friendly = "F";
const notFriendly = ["FWC_Q","CQ","CF","FWC","NL","FCC","OFT_A","FAC","FS","FAC_Q"];

const api = axios.create({
    baseURL: "https://inside.fifa.com",
    timeout: 30000,
});

async function callApi(ano) {
    const response = await Promise.all([
        api.get(`/api/data-centre/matches?gender=1&count=1000&year=${ano}${notFriendly.reduce((acc,crr) => `${acc}&competitionClassificationCode=${crr}`, '')}`),
        api.get(`/api/data-centre/matches?gender=1&count=1000&year=${ano}&competitionClassificationCode=${friendly}`)
    ]).then(([a, b]) => [...a.data, ...b.data])
    .then(items => items.sort((a,b) => a <= b ? -1 : 1));

    return response.map(item => ({
        idMatch: item.idMatch,
        idMatchIfes: item.idMatchIfes,
        idCompetition: item.idCompetition,
        idSeason: item.idSeason,
        idStage: item.idStage,
        competitionName: item.competitionName?.[0]?.description,
        seasonName: item.seasonName?.[0]?.description,
        stageName: item.stageName?.[0]?.description,
        matchDate: item.matchDate,
        teamAId: item.teamAId,
        teamBId: item.teamBId,
        teamAName: item.teamAName?.[0]?.description,
        teamBName: item.teamBName?.[0]?.description,
        teamACountryCode: item.teamACountryCode,
        teamBCountryCode: item.teamBCountryCode,
        teamAScore: item.teamAScore,
        teamBScore: item.teamBScore,
        teamAPenaltyScore: item.teamAPenaltyScore,
        teamBPenaltyScore: item.teamBPenaltyScore,
        resultType: item.resultType,
        winner: item.winner,
        stadiumName: item.stadiumName?.[0]?.description,
        hasPenalties: item.hasPenalties
    }))
}

function createBatches(itens, size) {
    const lotes = [];

    for (let i = 0; i < itens.length; i += size) {
        lotes.push(itens.slice(i, i + size));
    }

    return lotes;
}

async function main(anos, batchSize = 10) {
    let totalMatches = 0;
    const stream = fs.createWriteStream(OUTPUT_FILE, { encoding: "utf8" });
    let firstItem = true;
    stream.write("[\n");

    try {
        const batches = createBatches(anos, batchSize);
        console.log(`Total de lotes: ${batches.length}`);
        for (const [index, batch] of batches.entries()) {
            console.log(`Processando lote ${index + 1}/${batches.length}`);

            const data = await Promise.all(batch.map(id => callApi(id)));

            for (const itens of data) {
                totalMatches += itens.length;
                for (const item of itens) {
                    const json = JSON.stringify(item);
                    const texto = firstItem ? json : `,\n${json}`;
                    firstItem = false;

                    if (!stream.write(texto)) {
                        await once(stream, "drain");
                    }
                }
            }
        }

    } finally {
        stream.write("\n]");
        stream.end();
        await once(stream, "finish");
    }
    console.log("Processamento concluído.");
    console.log(`Total de consfrontos coletados: ${totalMatches}`);
}

const currentYear = 2026;
const firstYear = 1872;
const anos = Array.from({ length: (currentYear - firstYear) + 1 }, (_, i) => i + firstYear);


main(anos, 10).catch(console.error);