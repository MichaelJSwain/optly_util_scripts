function callback(activate, options) {
    optimizely.utils.waitForElement("selector")
    .then(elem => {
        activate();
    })
}