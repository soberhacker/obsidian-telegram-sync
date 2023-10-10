export const nowPaymentsLink = "https://nowpayments.io/donation?api_key=JMM7NE1-M4X4JY6-N8EK1GJ-H8XQXFK";
export const nowPaymentsImgLink =
	"https://img.buymeacoffee.com/button-api/?text=Cryptocurrency&emoji=%F0%9F%9A%80&slug=soberhacker&button_colour=e38215&font_colour=FFFFFF&font_family=Bree&outline_colour=000000&coffee_colour=FFDD00";
//export const nowPaymentsImgLink = "https://nowpayments.io/images/embeds/donation-button-white.svg";
export const nowPaymentsButton = createButton(nowPaymentsLink, nowPaymentsImgLink, 42);

export const paypalLink = "https://www.paypal.com/donate/?hosted_button_id=VYSCUZX8MYGCU";
//export const paypalImgLink = "https://www.paypalobjects.com/webstatic/en_US/i/buttons/PP_logo_h_100x26.png";
export const paypalImgLink = "https://www.paypalobjects.com/digitalassets/c/website/logo/full-text/pp_fc_hl.svg";
export const paypalButton = createButton(paypalLink, paypalImgLink, 47, 145);

export const buyMeACoffeeLink = "https://www.buymeacoffee.com/soberhacker";
export const buyMeACoffeeImgLink =
	"https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=soberhacker&button_colour=5F7FFF&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFFFFF";
export const buyMeACoffeeButton = createButton(buyMeACoffeeLink, buyMeACoffeeImgLink, 42);

export const kofiLink = "https://ko-fi.com/soberhacker";
export const kofiImgLink = "https://storage.ko-fi.com/cdn/brandasset/logo_white_stroke.png?";
export const kofiButton = createButton(kofiLink, kofiImgLink, 47, 145);

export const donationInlineKeyboard = [
	[
		{ text: "🚀  Cryptocurrency", url: nowPaymentsLink },
		{ text: "☕  Buy me a coffee", url: buyMeACoffeeLink },
	],
	[
		{ text: "💰  Ko-fi Donation", url: kofiLink },
		{ text: "💳  PayPal Donation", url: paypalLink },
	],
];

function createButton(link: string, imgLink: string, height?: number, width?: number): HTMLElement {
	const a = createEl("a");
	a.setAttribute("href", link);
	const img = a.createEl("img");
	img.src = imgLink;
	if (height) img.height = height;
	if (width) img.width = width;
	return a;
}
