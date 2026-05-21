const { GoogleSpreadsheet } = require('google-spreadsheet')
const creds = require('../credentials.json')
const { remote } = require('webdriverio')
const moment = require('moment')
const { JWT } = require('google-auth-library')
const fs = require('fs')
const path = require('path')

const logsDir = path.join(__dirname, '..', 'logs')
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir)
const logFile = path.join(logsDir, `${moment().format('YYYY-MM-DD_HH-mm-ss')}.log`)
const logLines = []

const origLog = console.log
const origError = console.error
console.log = (...args) => { const msg = args.join(' '); logLines.push(msg); origLog(...args) }
console.error = (...args) => { const msg = args.join(' '); logLines.push('[ERROR] ' + msg); origError(...args) }

const serviceAccountAuth = new JWT({
	email: creds.client_email,
	key: creds.private_key,
	scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const doc = new GoogleSpreadsheet(
	'1WrhE1sPdMXXn1OCSWkTE4aFgXLE9U73DZ4Y_IlUuWZM', serviceAccountAuth
)

const AllNZ = `https://www.trademe.co.nz/a/property/residential/sale/search?bof=Rk71pvsW`
const AllWellington = `https://www.trademe.co.nz/a/property/residential/sale/wellington/search?bof=Rk71pvsW`
const CenterWellington = `https://www.trademe.co.nz/a/property/residential/sale/wellington/wellington/search?bof=Rk71pvsW`
// const GirlsCollegeArea = undefined
const LowerHutt = `https://www.trademe.co.nz/a/property/residential/sale/wellington/lower-hutt/search?bof=Rk71pvsW`
const ChristchurchCity = `https://www.trademe.co.nz/a/property/residential/sale/canterbury/christchurch-city/search?bof=Rk71pvsW`
const AllAuckland = `https://www.trademe.co.nz/a/property/residential/sale/auckland/search?bof=Rk71pvsW`

String.prototype.getNumber = function () {
	return Number(this.split(' ')[1].replace(',', '').replace('+', ''))
}
;(async function () {
	const startAt = Date.now()
	let browser
	let summary

	const getTotalCount = async (location) => {
		await browser.url(location)

		const elementSelector = 'h3.tm-search-header-result-count__heading'
		await browser.waitUntil(
			async () => await browser.$(elementSelector).isExisting(),
			{
				timeout: 30000,
				timeoutMsg: `Element with selector "${elementSelector}" was not found`,
			}
		)

		const elementText = browser.$(elementSelector).getText()

		return new Promise((resolve, reject) => {
			elementText
				.then((text) => {
					resolve(text.getNumber())
				})
				.catch((error) => {
					reject(
						new Error(`Failed to fetch result count for ${location}: ${error.message}`)
					)
				})
		})
	}

	try {
		await doc.loadInfo()

		const sheet = doc.sheetsByTitle['Sheet1']
		const rows = await sheet.getRows()
		const lastRow = rows[rows.length - 1]
		const lastDate = moment(lastRow.get('date'), 'YYYY-MM-DD')
		const today = moment(new Date())

		browser = await remote({
			capabilities: {
				browserName: 'chrome',
				'goog:chromeOptions': {
					args: [
						'--headless',
						'--disable-gpu',
						// The following flags fix Chrome startup failures in
						// non-interactive environments (e.g. Windows Scheduled Tasks
						// running in Session 0 where there is no desktop).
						'--no-sandbox',
						'--disable-dev-shm-usage',
						'--disable-extensions',
						'--disable-background-networking',
					],
				},
			},
			// Retry connecting to ChromeDriver up to 3 times with a generous
			// timeout, because in scheduled-task environments ChromeDriver can
			// take longer than usual to become ready.
			connectionRetryCount: 3,
			connectionRetryTimeout: 180000,
		})

		console.log('fetching All NZ')
		const AllNZTotalCount = await getTotalCount(AllNZ)

		console.log('fetching All Wellington')
		const WellingtonTotalCount = await getTotalCount(AllWellington)

		console.log('fetching Center Wellington')
		const CenterWellingtonTotalCount = await getTotalCount(CenterWellington)

		console.log('fetching Lower Hutt')
		const LowerHuttTotalCount = await getTotalCount(LowerHutt)

		console.log('fetching Christchurch City')
		const ChristchurchCityTotalCount = await getTotalCount(ChristchurchCity)

		console.log('fetching Auckland')
		const AllAucklandTotalCount = await getTotalCount(AllAuckland)

		const isSameDate = moment(lastDate).isSame(today, 'day')
		if (isSameDate) {
			await lastRow.delete()
		}

		await sheet.addRow({
			date: moment().format('YYYY-MM-DD HH:mm'),
			'All New Zealand': AllNZTotalCount,
			'All Wellington': WellingtonTotalCount,
			'Center Wellington': CenterWellingtonTotalCount,
			'Lower Hutt': LowerHuttTotalCount,
			'Christchurch City': ChristchurchCityTotalCount,
			'All Auckland': AllAucklandTotalCount,
		})

		summary = {
			date: moment().format('YYYY-MM-DD HH:mm'),
			allNZ: AllNZTotalCount,
			allWellington: WellingtonTotalCount,
			centerWellington: CenterWellingtonTotalCount,
			lowerHutt: LowerHuttTotalCount,
			christchurchCity: ChristchurchCityTotalCount,
			allAuckland: AllAucklandTotalCount,
			updatedExistingDay: isSameDate,
		}

		console.log('✅ [SUCCESS] task.js completed')
		console.log(`✅ [SUCCESS] durationMs=${Date.now() - startAt}`)
		console.log(`✅ [SUCCESS] summary=${JSON.stringify(summary)}`)
	} catch (error) {
		console.error('❌ [FAILED] task.js failed')
		console.error(`❌ [FAILED] durationMs=${Date.now() - startAt}`)
		console.error(`❌ [FAILED] reason=${error.stack || error.message}`)
		process.exitCode = 1
	} finally {
		if (browser) {
			await browser.deleteSession().catch(() => {})
		}
		fs.readdirSync(logsDir).forEach(f => fs.unlinkSync(path.join(logsDir, f)))
		fs.writeFileSync(logFile, logLines.join('\n') + '\n')
		origLog(`📄 Log written to ${logFile}`)
	}
})()
