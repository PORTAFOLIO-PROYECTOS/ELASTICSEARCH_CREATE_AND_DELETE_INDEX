"use strict";

const utilsClass = require("./utils");
const elasticsearch = require("elasticsearch");
const request = require("async-request");
const config = require("./config");
const utils = new utilsClass();
const esClient = new elasticsearch.Client({
    host: config.elasticUrl
});

module.exports = class Base {
    async createIndice() {
        let indicesElastic = await this.getElasticIndices();
        let paises = utils.getCountries();

        await utils.asyncForEach(paises, async (pais) => {
            let response = await this.getCampaniasActivas(pais);
            console.log(`Pais: ${pais} | campañas: ${JSON.stringify(response)}`);

            for (const key in response) {
                const element = response[key];
                let indiceBuscar = `${config.indexName}_${pais.toLowerCase()}_${element.toString()}`;

                if (indicesElastic.indexOf(indiceBuscar) < 0){
                    console.log(`se crea el indice ${indiceBuscar}`);
                }
            }
        });

        console.log(indicesElastic);
    }

    async getCampaniasActivas(pais) {
        try {
            let urlGetCampanias = utils.getAtiveCampaignsUrlWithCountry(pais);
            let responseCampanias = await request(urlGetCampanias);
            return JSON.parse(responseCampanias.body);
        } catch (error) {
            console.error(error);
        }
    }

    async getElasticIndices() {
        try {
            let params = {
                "h": ["index"],
                "format": "json",
                "index": "producto*"
            }

            let indices = [];

            return new Promise((resolve, reject) => {
                esClient.cat.indices(params, (error, response, status) => {
                    if (error) reject(error);
                    response.forEach(element => {
                        indices.push(element.index);
                    });
                    resolve(indices);
                });
            });
        } catch (error) {
            console.error(error);
            return [];
        }
    }
}
