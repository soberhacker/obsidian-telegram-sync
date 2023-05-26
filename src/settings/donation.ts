export const cryptoDonationLink = "https://oxapay.com/donate/5855474";
export const cryptoDonationImgLink =
	"https://img.buymeacoffee.com/button-api/?text=Crypto%20Donation&emoji=🚀&slug=soberhacker&button_colour=5b5757&font_colour=ffffff&font_family=Lato&outline_colour=ffffff&coffee_colour=FFDD00";
export const cryptoDonationButton = createDonationButton(cryptoDonationLink, cryptoDonationImgLink, 42);

export const paypalLink = "https://www.paypal.com/donate/?hosted_button_id=VYSCUZX8MYGCU";
export const paypalImgLink = "https://www.paypalobjects.com/webstatic/en_US/i/buttons/PP_logo_h_100x26.png";
export const paypalButton = createDonationButton(paypalLink, paypalImgLink, 40, 150);

export const buyMeACoffeeLink = "https://www.buymeacoffee.com/soberhacker";
export const buyMeACoffeeImgLink =
	"https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20banana&emoji=🍌&slug=soberhacker&button_colour=FF5F5F&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00";
export const buyMeACoffeeButton = createDonationButton(buyMeACoffeeLink, buyMeACoffeeImgLink, 42);

export const kofiLink = "https://ko-fi.com/soberhacker";
export const kofiImgLink = "https://storage.ko-fi.com/cdn/brandasset/logo_white_stroke.png?";
export const kofiButton = createDonationButton(kofiLink, kofiImgLink, 47, 145);

function createDonationButton(link: string, imgLink: string, height?: number, width?: number): HTMLElement {
	const a = createEl("a");
	a.setAttribute("href", link);
	const img = a.createEl("img");
	img.src = imgLink;
	if (height) img.height = height;
	if (width) img.width = width;
	return a;
}
