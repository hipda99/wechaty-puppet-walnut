#!/usr/bin/env ts-node

import test  from 'blue-tape'

import { getOaOptions } from '../tests/fixtures/oa-options'

import { PuppetWalnut } from './puppet-walnut'

const ciInfo = require('ci-info')

class PuppetWalnetTest extends PuppetWalnut {
}

test('tbw', async t => {
  if (ciInfo.isPR) {
    t.skip('Skip for PR')
    return
  }

  const oa = new PuppetWalnetTest({
    ...getOaOptions(),
  })
  t.ok(oa, 'should be ok')
})
