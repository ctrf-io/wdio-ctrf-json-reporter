import { expect, browser } from '@wdio/globals'

describe('Root suite', () => {
  it('Root test', async () => {
    await browser.pause(100)
  })
  describe('Inner Suite', () => {
    it('Inner test 1', async () => {
      await browser.pause(1000)
    })
    it.skip('Inner test 2 skip', async () => {
      await browser.pause(1000)
    })
    it('Inner test 2 failed', async () => {
      await browser.url(`https://the-internet.herokuapp.com/login`)
      await browser.pause(2000)
      await expect(browser).toHaveTitle('The Internet')
    })
    it('Inner test 3', async () => {
      await browser.pause(3000)
    })
  })
})
