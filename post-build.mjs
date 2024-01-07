import fs from "fs";

const mainPath = "main.js";

fs.readFile(mainPath, "utf8", function (err, data) {
	if (err) {
		return console.log(err);
	}
	var result = data.replace('require("punycode/")', 'require("punycode")');

	fs.writeFile(mainPath, result, "utf8", function (err) {
		if (err) return console.log(err);
	});
});
