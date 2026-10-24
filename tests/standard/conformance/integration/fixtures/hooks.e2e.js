describe("hook failure", () => {
	beforeEach(() => {
		throw Error("fixture hook failure");
	});
	it("unreached", () => {});
	it("skip after hook", () => {});
});
describe("timeout", () => {
	it("times out", function () {
		this.timeout(30);
		return new Promise(() => {});
	});
});
