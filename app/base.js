"use strict";

const elasticsearch = require("elasticsearch");
const request = require("request");

const utilsClass = require("./utils");
const config = require("./config");
const data = require("./data");

const utils = new utilsClass();
const esClient = new elasticsearch.Client({
    host: config.elasticUrl
});

module.exports = class Base {
    async inicio() {
        let indicesElastic = await this.getElasticIndices();
        let paises = utils.getCountries();

        await utils.asyncForEach(paises, async (pais) => {
            let response = await this.getCampaniasActivas(pais);
            if (response) response = JSON.parse(response);
            let indicesCreados = utils.getIndicesPorPais(pais.toLowerCase(), indicesElastic);

            console.log("*******");
            console.log(`Pais: ${pais} | campañas activas: ${JSON.stringify(response)}`);
            console.log("Indices creados:", indicesCreados);

            for (const key in response) {
                const element = response[key];
                let indiceBuscar = `${config.indexName}_${pais.toLowerCase()}_${element.toString()}`;

                if (indicesElastic.indexOf(indiceBuscar) < 0) { // SI ES MENOR QUE CERO
                    this.createIndex(indiceBuscar);
                } else {
                    let index = indicesCreados.indexOf(indiceBuscar);
                    if (index > -1) indicesCreados.splice(index, 1);
                }
            }

            for (const key in indicesCreados) {
                const element = indicesCreados[key];
                this.deleteIndex(element);
            }

        });

    }

    createIndex(nameIndex) {
        console.log(`se crea el indice ${nameIndex}`);

        let params = {
            index: nameIndex,
            body: data.createIndex
        }

        esClient.indices.create(params, (error, response, status) => {
            if (error) console.log("Error al crear indice: ", nameIndex);
            console.log("Indice creado: ", nameIndex, JSON.stringify(response));
        });
    }

    deleteIndex(nameIndex) {
        console.log(`se elimina el indice ${nameIndex}`);
        let params = {
            index: nameIndex,
            body: []
        }

        esClient.indices.delete(params, (error, response, status) => {
            if (error) console.log("Error al eliminar indice:", nameIndex);
            console.log("Indice eliminado", nameIndex, JSON.stringify(response));
        });
    }

    async getCampaniasActivas(pais) {
        try {
            let urlGetCampanias = utils.getAtiveCampaignsUrlWithCountry(pais);
            return new Promise((resolve, reject) => {
                request(urlGetCampanias, (error, response, body) => {
                    if (error) reject(error);
                    resolve(body);
                });
            });
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

/**
 *
 */