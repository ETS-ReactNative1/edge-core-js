// @flow

import {
  type Cleaner,
  asArray,
  asDate,
  asNumber,
  asObject,
  asOptional,
  asString,
  asValue
} from 'cleaners'

import {
  asBase32,
  asBase64,
  asEdgeBox,
  asEdgeSnrp,
  asRecovery2Auth
} from './server-cleaners.js'
import { type EdgeBox, type EdgeSnrp } from './server-types.js'

export type VoucherDump = {
  // Identity:
  loginId: Uint8Array,
  voucherAuth: Uint8Array,
  voucherId: string,

  // Login capability:
  created: Date,
  activates: Date, // Automatically becomes approved on this date
  status: 'pending' | 'approved' | 'rejected',

  // Information about the login:
  ip: string,
  ipDescription: string,
  deviceDescription: string | void
}

export type LoginDump = {
  // Identity:
  appId: string,
  created: Date,
  loginId: Uint8Array,

  // Nested logins:
  parentBox?: EdgeBox,
  parentId?: Uint8Array, // loginId

  // 2-factor login:
  otpKey?: Uint8Array,
  otpResetAuth?: string,
  otpResetDate?: Date,
  otpTimeout?: number,

  // Password login:
  passwordAuth?: Uint8Array,
  passwordAuthBox?: EdgeBox,
  passwordAuthSnrp?: EdgeSnrp,
  passwordBox?: EdgeBox,
  passwordKeySnrp?: EdgeSnrp,

  // PIN v2 login:
  pin2Id?: Uint8Array, // base64
  pin2Auth?: Uint8Array,
  pin2Box?: EdgeBox,
  pin2KeyBox?: EdgeBox,
  pin2TextBox?: EdgeBox,

  // Recovery v2 login:
  recovery2Id?: Uint8Array, // base64
  recovery2Auth?: Uint8Array[],
  recovery2Box?: EdgeBox,
  recovery2KeyBox?: EdgeBox,
  question2Box?: EdgeBox,

  // Secret-key login:
  loginAuth?: Uint8Array,
  loginAuthBox?: EdgeBox,

  // Resources:
  children: LoginDump[],
  keyBoxes: EdgeBox[],
  mnemonicBox?: EdgeBox,
  rootKeyBox?: EdgeBox,
  syncKeyBox?: EdgeBox,
  vouchers: VoucherDump[],

  // Obsolete:
  pinBox?: EdgeBox,
  pinId?: string,
  pinKeyBox?: EdgeBox
}

export type FakeUser = {
  lastLogin?: Date,
  loginId: Uint8Array,
  loginKey: Uint8Array,
  repos: { [repo: string]: { [path: string]: EdgeBox } },
  server: LoginDump,
  username: string
}

export const asVoucherDump = asObject({
  // Identity:
  loginId: asBase64,
  voucherAuth: asBase64,
  voucherId: asString,

  // Login capability:
  created: asDate,
  activates: asDate, // Automatically becomes approved on this date
  status: asValue('pending', 'approved', 'rejected'),

  // Information about the login:
  ip: asString,
  ipDescription: asString,
  deviceDescription: asOptional(asString)
})

export const asLoginDump: Cleaner<LoginDump> = asObject({
  // Identity:
  appId: asString,
  created: raw => (raw == null ? new Date() : asDate(raw)),
  loginId: asBase64,

  // Nested logins:
  children: asOptional(
    asArray(raw => asLoginDump(raw)),
    []
  ),
  parentBox: asOptional(asEdgeBox),
  parentId: (): Uint8Array | void => undefined,

  // 2-factor login:
  otpKey: asOptional(asBase32),
  otpResetAuth: asOptional(asString),
  otpResetDate: asOptional(asDate),
  otpTimeout: asOptional(asNumber),

  // Password login:
  passwordAuth: asOptional(asBase64),
  passwordAuthBox: asOptional(asEdgeBox),
  passwordAuthSnrp: asOptional(asEdgeSnrp),
  passwordBox: asOptional(asEdgeBox),
  passwordKeySnrp: asOptional(asEdgeSnrp),

  // PIN v2 login:
  pin2Id: asOptional(asBase64),
  pin2Auth: asOptional(asBase64),
  pin2Box: asOptional(asEdgeBox),
  pin2KeyBox: asOptional(asEdgeBox),
  pin2TextBox: asOptional(asEdgeBox),

  // Recovery v2 login:
  recovery2Id: asOptional(asBase64),
  recovery2Auth: asOptional(asRecovery2Auth),
  question2Box: asOptional(asEdgeBox),
  recovery2Box: asOptional(asEdgeBox),
  recovery2KeyBox: asOptional(asEdgeBox),

  // Secret-key login:
  loginAuth: asOptional(asBase64),
  loginAuthBox: asOptional(asEdgeBox),

  // Keys and assorted goodies:
  keyBoxes: asOptional(asArray(asEdgeBox), []),
  mnemonicBox: asOptional(asEdgeBox),
  rootKeyBox: asOptional(asEdgeBox),
  syncKeyBox: asOptional(asEdgeBox),
  vouchers: asOptional(asArray(asVoucherDump), []),

  // Obsolete:
  pinBox: asOptional(asEdgeBox),
  pinId: asOptional(asString),
  pinKeyBox: asOptional(asEdgeBox)
})

export const asFakeUser: Cleaner<FakeUser> = asObject({
  lastLogin: asOptional(asDateObject),
  loginId: asBase64,
  loginKey: asBase64,
  repos: asObject(asObject(asEdgeBox)),
  server: asLoginDump,
  username: asString
})

export const asFakeUsers: Cleaner<FakeUser[]> = asArray(asFakeUser)

function asDateObject(raw: mixed): Date {
  if (raw instanceof Date) return raw
  throw new TypeError('Expecting a Date')
}
