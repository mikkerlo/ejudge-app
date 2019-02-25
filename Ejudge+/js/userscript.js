//////////// Utils ////////////

const storageGet = arg => {
    return new Promise(resolve => chrome.storage.sync.get(arg, resolve))
}

const storageSet = arg => {
    return new Promise(resolve => chrome.storage.sync.set(arg, resolve))
}

//////////// Title ////////////

const parseTitleInfo = title => {
    const infoRegExp = /([a-zA-Zа-яА-Я ]+)\[.*(17[0-9]-[12])/

    const res = title.match(infoRegExp)
    if (!res) {
        return null
    }

    const info = [res[1].trim(), res[2].trim()]
    if (info[0] === "User login page") {
        return null
    }

    return info
}

const beautifyTitle = elem => {
    elem.innerHTML = "Кокосик"
    elem.style.opacity = "1"
}

//////////// Problems ////////////

const filterProblemsByReg = (problems, regexp) => {
    try {
        const reg = new RegExp(regexp)
        return problems.filter(it => reg.test(it.innerText))
    } catch (e) {}
    return []
}

const hideProblems = (problems, options) => {
    problems.forEach(it => (it.style.display = ""))

    const hideOk = options.hideOk
        ? Array.from(document.querySelectorAll("#probNavRightList .probOk"))
        : []

    const hideBad = options.hideBad
        ? Array.from(document.querySelectorAll("#probNavRightList .probBad"))
        : []

    const hideNew = options.hideNew
        ? Array.from(document.querySelectorAll("#probNavRightList .probEmpty"))
        : []

    const hideReg = options.hideReg
        ? filterProblemsByReg(problems, options.hideReg)
        : []

    const hide = [...hideOk, ...hideBad, ...hideNew, ...hideReg]
    hide.forEach(it => (it.style.display = "none"))
}

const storeProblems = problems => {
    const problemsStorage = {}

    problems.forEach(it => {
        const problem = {
            name: it.innerText,
            link: it.children[0].href,
        }

        problemsStorage[`problem_${problem.name}`] = problem
    })

    storageSet(problemsStorage)
}

//////////// Table ////////////

const updateProblemHeader = (h, problem) => {
    const a = document.createElement("a")
    a.href = problem.link
    a.textContent = problem.name

    h.firstChild.remove()
    h.appendChild(a)
}

const scrollTable = () => {
    const l14 = document.querySelector("html .l14")
    if (l14) {
        l14.scrollLeft = l14.scrollWidth
    }
}

const showPercentile = () => {
    if (document.querySelector('.standings') === null) {
        console.log("Table not found.")
        return
    }
    const standings = document.querySelector('.standings').firstElementChild;
    const standingsTop = standings.firstElementChild;

    const percentileElement = document.createElement('th')
    percentileElement.setAttribute('class', 'st_score')
    percentileElement.innerText = "Percentile"
    standings.children[0].appendChild(percentileElement)
    
    const markElement = document.createElement('th')
    markElement.setAttribute('class', 'st_score')
    markElement.innerText = "Mark"
    standings.children[0].appendChild(markElement)

    const problemsNumber = standingsTop.querySelectorAll('.st_prob').length;
    let krsNumber = 0
    Array.from(standingsTop.querySelectorAll('.st_prob')).map(
        (problem) => {
            if (problem.innerText.indexOf('kr') != -1) {
                krsNumber += 1
            }
        }
    )
    const users = Array
                    .from(standings.querySelectorAll('.st_team'))
                    .slice(1, -3)
    users.forEach(
        (user, index) => {
            const userTotal = parseInt(
                standings
                    .children[index + 1]
                    .querySelector('.st_score')
                    .innerText
            )
            let userPercentile = parseInt(
                userTotal / ((problemsNumber + krsNumber) * 100) * 100
            )
            if (userTotal % (problemsNumber + krsNumber) !== 0) {
                userPercentile += 1
            }

            let userMark = 0
            const markRanges = [
                15, // 1
                20, // 2
                25, // 3
                30, // 4
                40, // 5
                45, // 6
                55, // 7
                65, // 8
                75, // 9
            ]

            markRanges.forEach((goal) => {
                if (userPercentile >= goal) {
                    userMark += 1
                }
            })

            const userPercentileElement = document.createElement('td')
            userPercentileElement.setAttribute('class', 'st_score')
            userPercentileElement.innerText = userPercentile + '%'
            standings.children[index + 1].appendChild(userPercentileElement)

            const userMarkElement = document.createElement('td')
            userMarkElement.setAttribute('class', 'st_score')
            userMarkElement.innerText = userMark
            standings.children[index + 1].appendChild(userMarkElement)

        }
    )
}

const tableUpdate = () => {
    const problemsList = document.querySelectorAll("th.st_prob")
    if (!problemsList) {
        console.log("Table header not found.")
        return
    }

    const problems = Array.from(problemsList)

    problems.forEach(h => {
        const key = `problem_${h.innerText}`
        storageGet(key)
            .then(it => it[key])
            .then(problem => problem && updateProblemHeader(h, problem))
    })

    scrollTable()
    showPercentile()
}

//////////// Main ////////////

const problemsUpdate = () => {
    const problemsList = document.querySelector("#probNavRightList")
    if (!problemsList) {
        console.log("Side panel with problems not found.")
        return
    }

    const problems = Array.from(problemsList.children)

    const fetchAndUpdate = () =>
        storageGet({
            hideOk: false,
            hideBad: false,
            hideNew: false,
            hideReg: "",
        }).then(options => hideProblems(problems, options))

    // hide by current options
    fetchAndUpdate()

    // listen for options updates
    chrome.runtime.onMessage.addListener(request => {
        if (request.type === "fkm-update-problems") {
            fetchAndUpdate()
        }
    })

    // save problems in storage
    storeProblems(problems)
}

const kokosUpdate = () => {
    const titleElem = document.querySelector("#l12 .main_phrase")
    if (!titleElem) {
        console.log("Title not found, not ejudge page. Exiting Ejudge+...")
        return
    }

    const info = parseTitleInfo(titleElem.innerText)
    beautifyTitle(titleElem)

    if (!info) {
        console.log("Title not parsed. Login page?")
        return
    }

    problemsUpdate()
    tableUpdate()
    storageSet({ fkmInfo: info })
}

kokosUpdate()
