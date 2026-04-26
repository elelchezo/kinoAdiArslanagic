const projekcije = [];

let trenutniIndex = 0;

const dozvoljeniStatusi = ["slobodno", "zauzeto", "rezervisano"];
const oznakeRedova = ["A", "B", "C", "D", "E", "F", "G", "H"];

// ---------------------------------------------------------------
// Konvertuje projekciju iz app.js formata u interni 2D array format
// i dodaje je u niz projekcije.
// NE poziva prikaziSalu() — inicijalni render radi DOMContentLoaded.
//
// Očekivani format ulaza:
// {
//   film: "Naziv",
//   vrijeme: "18:00",
//   sala: 1,
//   sjedista: [
//     { red: "A", broj: 1, status: "slobodno" },
//     ...
//   ]
// }
// ---------------------------------------------------------------
function inicijalizujSalu(projekcijaIzAppJs) {
    const sjedista2D = Array.from({ length: 8 }, () =>
        Array(10).fill("slobodno")
    );

    for (const sjediste of projekcijaIzAppJs.sjedista) {
        const redIndex = oznakeRedova.indexOf(sjediste.red);
        const kolonaIndex = sjediste.broj - 1;

        if (
            redIndex !== -1 &&
            kolonaIndex >= 0 &&
            kolonaIndex < 10 &&
            dozvoljeniStatusi.includes(sjediste.status)
        ) {
            sjedista2D[redIndex][kolonaIndex] = sjediste.status;
        }
    }

    projekcije.push({
        nazivFilma: projekcijaIzAppJs.film,
        datum: projekcijaIzAppJs.datum,
        vrijeme: projekcijaIzAppJs.vrijeme,
        brojSale: projekcijaIzAppJs.sala,
        sjedista: sjedista2D
    });
}

// ---------------------------------------------------------------
// Validacija: barem jedna projekcija, ispravna struktura i statusi
// ---------------------------------------------------------------
function validirajPodatke(listaProjekcija) {
    if (!Array.isArray(listaProjekcija) || listaProjekcija.length === 0) {
        return false;
    }

    for (const projekcija of listaProjekcija) {
        if (
            !projekcija ||
            typeof projekcija.nazivFilma !== "string" ||
            typeof projekcija.vrijeme !== "string" ||
            projekcija.brojSale === undefined ||
            !Array.isArray(projekcija.sjedista) ||
            projekcija.sjedista.length !== 8
        ) {
            return false;
        }

        for (const red of projekcija.sjedista) {
            if (!Array.isArray(red) || red.length !== 10) {
                return false;
            }

            for (const status of red) {
                if (!dozvoljeniStatusi.includes(status)) {
                    return false;
                }
            }
        }
    }

    return true;
}

// ---------------------------------------------------------------
// Ažurira disabled stanje dugmadi na osnovu trenutnog indexa
// ---------------------------------------------------------------
function azurirajDugmad() {
    const btnPrethodna = document.getElementById("prethodnaProjekcija");
    const btnSljedeca = document.getElementById("sljedecaProjekcija");

    if (!btnPrethodna || !btnSljedeca) return;

    btnPrethodna.disabled = trenutniIndex === 0;
    btnSljedeca.disabled = trenutniIndex === projekcije.length - 1;
}

function prikaziGresku() {
    const salaDiv = document.getElementById("sala-prikaz"); // ← izmjena
    if (!salaDiv) return;

    salaDiv.innerHTML = "<p>Podaci nisu validni!</p>";
    azurirajDugmad();
}

function prikaziSalu() {
    const salaDiv = document.getElementById("sala-prikaz"); // ← izmjena
    if (!salaDiv) return;

    salaDiv.innerHTML = "";

    if (!validirajPodatke(projekcije)) {
        prikaziGresku();
        return;
    }

    const projekcija = projekcije[trenutniIndex];

    salaDiv.appendChild(kreirajInfoSekciju(projekcija));
    salaDiv.appendChild(kreirajPlatno());
    salaDiv.appendChild(kreirajSjedista(projekcija));

    azurirajDugmad();
}

function kreirajInfoSekciju(projekcija) {
    const info = document.createElement("div");
    info.className = "info-card";

    info.innerHTML = `
        <h3>${projekcija.nazivFilma}</h3>
        <p>Sala: ${projekcija.brojSale} &nbsp;|&nbsp; Termin: ${projekcija.vrijeme}</p>
    `;

    return info;
}

function kreirajPlatno() {
    const platno = document.createElement("div");
    platno.className = "screen";
    platno.textContent = "PLATNO";
    return platno;
}

// Mapa: interni status (bosanski) → CSS klasa (engleski)
const statusKlasa = {
    slobodno: "free",
    zauzeto: "taken",
    rezervisano: "reserved"
};

function kreirajSjedista(projekcija) {
    const wrapper = document.createElement("div");
    wrapper.className = "seating-card";

    const container = document.createElement("div");
    container.className = "seats-container";

    projekcija.sjedista.forEach((red, redIndex) => {
        const redDiv = document.createElement("div");
        redDiv.className = "row";

        const oznaka = document.createElement("span");
        oznaka.className = "row-label";
        oznaka.textContent = oznakeRedova[redIndex];
        redDiv.appendChild(oznaka);

        red.forEach((status, kolonaIndex) => {
            const sjediste = document.createElement("div");
            sjediste.className = `seat ${statusKlasa[status]}`;
            sjediste.setAttribute(
                "aria-label",
                `Red ${oznakeRedova[redIndex]}, sjedište ${kolonaIndex + 1}, status ${status}`
            );

            sjediste.addEventListener("click", () => {
                const trenutniStatus = projekcije[trenutniIndex].sjedista[redIndex][kolonaIndex];

                if (trenutniStatus === "slobodno") {
                    projekcije[trenutniIndex].sjedista[redIndex][kolonaIndex] = "zauzeto";
                    localStorage.setItem("projekcije", JSON.stringify(projekcije)); // ← dodaj
                    prikaziSalu();
                } else if (trenutniStatus === "zauzeto") {
                    projekcije[trenutniIndex].sjedista[redIndex][kolonaIndex] = "slobodno";
                    localStorage.setItem("projekcije", JSON.stringify(projekcije)); // ← dodaj
                    prikaziSalu();
                }
            });

            redDiv.appendChild(sjediste);
        });

        container.appendChild(redDiv);
    });

    wrapper.appendChild(container);
    return wrapper;
}
// ---------------------------------------------------------------
// Briše sadržaj #sala diva i renderuje trenutnu projekciju
// ---------------------------------------------------------------


// ---------------------------------------------------------------
// Jedino mjesto za inicijalni render i postavljanje dugmadi.
// app.js se izvršava PRIJE ovog listenera i puni niz projekcije[].
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const btnPrethodna = document.getElementById("prethodnaProjekcija");
    const btnSljedeca = document.getElementById("sljedecaProjekcija");
    const btnPrikazi = document.getElementById("btnPrikaziSalu"); // ← novo

    // Dinamički ažuriraj filmove i termine na osnovu odabranog datuma
    const datumSelect = document.getElementById("datumSelect");
    const filmSelect = document.getElementById("filmSelect");
    const terminSelect = document.getElementById("terminSelect");

    function azurirajFilmSelekt() {
        const odabraniDatum = datumSelect.value;
        const filmsZaDatum = projekcije.filter(p => p.datum === odabraniDatum);

        filmSelect.innerHTML = "";
        filmsZaDatum.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.nazivFilma;
            opt.textContent = p.nazivFilma;
            filmSelect.appendChild(opt);
        });

        azurirajTerminSelekt();
    }

    function azurirajTerminSelekt() {
        const odabraniDatum = datumSelect.value;
        const odabraniFilm = filmSelect.value;
        const projekcijaZaFilm = projekcije.find(
            p => p.datum === odabraniDatum && p.nazivFilma === odabraniFilm
        );

        terminSelect.innerHTML = "";
        if (projekcijaZaFilm) {
            const opt = document.createElement("option");
            opt.value = projekcijaZaFilm.vrijeme;
            opt.textContent = projekcijaZaFilm.vrijeme;
            terminSelect.appendChild(opt);
        }
    }

    if (datumSelect) {
        datumSelect.addEventListener("change", azurirajFilmSelekt);
        filmSelect.addEventListener("change", azurirajTerminSelekt);
        azurirajFilmSelekt(); // inicijalno postavi
    }

    if (btnPrethodna) {
        btnPrethodna.addEventListener("click", () => {
            if (trenutniIndex > 0) {
                trenutniIndex--;
                prikaziSalu();
            }
        });
    }

    if (btnSljedeca) {
        btnSljedeca.addEventListener("click", () => {
            if (trenutniIndex < projekcije.length - 1) {
                trenutniIndex++;
                prikaziSalu();
            }
        });
    }

    // ← novo: Prikaži salu na osnovu filtera
    if (btnPrikazi) {
        btnPrikazi.addEventListener("click", () => {
            const odabraniFilm = document.getElementById("filmSelect").value;
            const odabraniTermin = document.getElementById("terminSelect").value;

            const nadeniIndex = projekcije.findIndex(
                p => p.nazivFilma === odabraniFilm && p.vrijeme === odabraniTermin
            );

            if (nadeniIndex !== -1) {
                trenutniIndex = nadeniIndex;
                prikaziSalu();
            } else {
                const salaDiv = document.getElementById("sala-prikaz");
                if (salaDiv) {
                    salaDiv.innerHTML = "<p>Nema projekcije za odabrane parametre.</p>";
                }
            }
        });
    }

    // Učitaj sačuvana sjedišta iz localStorage ako postoje
    const sacuvano = localStorage.getItem("projekcije");
    if (sacuvano) {
        const sacuvaneProjekcije = JSON.parse(sacuvano);
        sacuvaneProjekcije.forEach((sacuvana, i) => {
            if (projekcije[i]) {
                projekcije[i].sjedista = sacuvana.sjedista;
            }
        });
    }

    trenutniIndex = 0;
    prikaziSalu();
});