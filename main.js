const pkg = require('apify');
const Apify = pkg;

Apify.main(async () => {
    console.log('✅ Script started');

    const input = await Apify.getInput();
    console.log('Input:', input);

    await Apify.setValue('OUTPUT', { success: true });
});
