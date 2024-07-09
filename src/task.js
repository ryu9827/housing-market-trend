const { GoogleSpreadsheet } = require('google-spreadsheet')
const creds = require('../credentials.json')
const { remote } = require('webdriverio')
const moment = require('moment')

const doc = new GoogleSpreadsheet(
	'1WrhE1sPdMXXn1OCSWkTE4aFgXLE9U73DZ4Y_IlUuWZM'
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
	const getTotalCount = async (location) => {
		await browser.url(location)
		

		return new Promise((resolve, reject) => {
			browser
				.$('h3.tm-search-header-result-count__heading.ng-star-inserted')
				.getText()
				.then((text) => {
					resolve(text.getNumber())
				})
				.catch((error) => {
					console.log('error = ', error)
					console.log(
						`An error happens while fetching this location: ${location}.`
					)
				})
		})
	}

	await doc.useServiceAccountAuth(creds)

	await doc.loadInfo()

	const sheet = doc.sheetsByTitle['Sheet1']
	const rows = await sheet.getRows()
	const lastRow = rows[rows.length - 1]
	const lastDate = moment(lastRow.date, 'YYYY-MM-DD')
	const today = moment(new Date())

	const browser = await remote({
		capabilities: {
			browserName: 'chrome',
			'goog:chromeOptions': {
				// to run chrome headless the following flags are required
				// (see https://developers.google.com/web/updates/2017/04/headless-chrome)
				args: ['--headless', '--disable-gpu'],
			},
		},
	})

	const AllNZTotalCount = await getTotalCount(AllNZ)
	const WellingtonTotalCount = await getTotalCount(AllWellington)
	const CenterWellingtonTotalCount = await getTotalCount(CenterWellington)
	// const GirlsCollegeAreaTotalCount = await getTotalCount(GirlsCollegeArea)
	const LowerHuttTotalCount = await getTotalCount(LowerHutt)
	const ChristchurchCityTotalCount = await getTotalCount(ChristchurchCity)
	const AllAucklandTotalCount = await getTotalCount(AllAuckland)

	// close the browser automatically
	await browser.deleteSession()

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
})()
