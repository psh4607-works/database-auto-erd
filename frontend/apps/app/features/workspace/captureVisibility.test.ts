import { expect, it } from 'vitest'
import { captureVisibility } from './captureVisibility'

it('retains hidden tables outside the filtered canvas when hiding or showing all rendered tables', () => {
  expect(
    captureVisibility(['infra.secret'], ['app.users'], ['app.users']),
  ).toEqual(['infra.secret', 'app.users'])
  expect(
    captureVisibility(['infra.secret', 'app.users'], ['app.users'], []),
  ).toEqual(['infra.secret'])
  expect(
    captureVisibility(['infra.secret'], ['app.users'], ['infra.secret']),
  ).toEqual(['infra.secret'])
})
