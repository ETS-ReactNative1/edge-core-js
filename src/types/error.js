// @flow

import { base64 } from 'rfc4648'

import { asOtpErrorPayload, asPasswordErrorPayload } from './server-cleaners.js'
import type { EdgeSwapInfo } from './types.js'

/*
 * These are errors the core knows about.
 *
 * The GUI should handle these errors in an "intelligent" way, such as by
 * displaying a localized error message or asking the user for more info.
 * All these errors have a `name` field, which the GUI can use to select
 * the appropriate response.
 *
 * Other errors are possible, of course, since the Javascript language
 * itself can generate exceptions. Those errors won't have a `type` field,
 * and the GUI should just show them with a stack trace & generic message,
 * since the program has basically crashed at that point.
 */

export const errorNames = {
  DustSpendError: 'DustSpendError',
  InsufficientFundsError: 'InsufficientFundsError',
  SpendToSelfError: 'SpendToSelfError',
  NetworkError: 'NetworkError',
  ObsoleteApiError: 'ObsoleteApiError',
  OtpError: 'OtpError',
  PasswordError: 'PasswordError',
  PendingFundsError: 'PendingFundsError',
  SameCurrencyError: 'SameCurrencyError',
  SwapAboveLimitError: 'SwapAboveLimitError',
  SwapBelowLimitError: 'SwapBelowLimitError',
  SwapCurrencyError: 'SwapCurrencyError',
  SwapPermissionError: 'SwapPermissionError',
  UsernameError: 'UsernameError',
  NoAmountSpecifiedError: 'NoAmountSpecifiedError'
}

/**
 * Trying to spend an uneconomically small amount of money.
 */
export class DustSpendError extends Error {
  name: string

  constructor(message: string = 'Please send a larger amount') {
    super(message)
    this.name = errorNames.DustSpendError
  }
}

/**
 * Trying to spend more money than the wallet contains.
 */
export class InsufficientFundsError extends Error {
  name: string
  +currencyCode: string | void

  constructor(currencyCode?: string) {
    let message
    if (currencyCode == null) {
      message = 'Insufficient funds'
    } else if (currencyCode.length > 5) {
      // Some plugins pass a message instead of a currency code:
      message = currencyCode
      currencyCode = undefined
    } else {
      message = `Insufficient ${currencyCode}`
    }

    super(message)
    this.name = errorNames.InsufficientFundsError
    if (currencyCode != null) this.currencyCode = currencyCode
  }
}

/**
 * Trying to spend to an address of the source wallet
 */
export class SpendToSelfError extends Error {
  name: string

  constructor(message: string = 'Spending to self') {
    super(message)
    this.name = errorNames.SpendToSelfError
  }
}

/**
 * Attempting to create a MakeSpend without specifying an amount of currency to send
 */
export class NoAmountSpecifiedError extends Error {
  name: string

  constructor(message: string = 'Unable to create zero-amount transaction.') {
    super(message)
    this.name = errorNames.NoAmountSpecifiedError
  }
}

/**
 * Could not reach the server at all.
 */
export class NetworkError extends Error {
  name: string
  +type: string // deprecated

  constructor(message: string = 'Cannot reach the network') {
    super(message)
    this.name = this.type = errorNames.NetworkError
  }
}

/**
 * The endpoint on the server is obsolete, and the app needs to be upgraded.
 */
export class ObsoleteApiError extends Error {
  name: string
  +type: string // deprecated

  constructor(message: string = 'The application is too old. Please upgrade.') {
    super(message)
    this.name = this.type = errorNames.ObsoleteApiError
  }
}

/**
 * The OTP token was missing / incorrect.
 *
 * The error object should include a `resetToken` member,
 * which can be used to reset OTP protection on the account.
 *
 * The error object may include a `resetDate` member,
 * which indicates that an OTP reset is already pending,
 * and when it will complete.
 */
export class OtpError extends Error {
  name: string
  +type: string // deprecated
  +loginId: string | void
  +reason: 'ip' | 'otp'
  +resetDate: Date | void
  +resetToken: string | void
  +voucherId: string | void
  +voucherAuth: string | void // base64, to avoid a breaking change
  +voucherActivates: Date | void

  constructor(resultsJson: mixed, message: string = 'Invalid OTP token') {
    super(message)
    this.name = this.type = errorNames.OtpError
    this.reason = 'otp'

    try {
      const reply = asOtpErrorPayload(resultsJson)

      // This should usually be present:
      if (reply.login_id != null) {
        this.loginId = reply.login_id
      }

      // Use this to request an OTP reset (if enabled):
      if (reply.otp_reset_auth != null) {
        this.resetToken = reply.otp_reset_auth
      }

      // We might also get a different reason:
      if (reply.reason === 'ip') this.reason = 'ip'

      // Set if an OTP reset has already been requested:
      if (reply.otp_timeout_date != null) {
        this.resetDate = new Date(reply.otp_timeout_date)
      }

      // We might also get a login voucher:
      if (reply.voucher_activates != null) {
        this.voucherActivates = reply.voucher_activates
      }
      if (reply.voucher_auth != null) {
        this.voucherAuth = base64.stringify(reply.voucher_auth)
      }
      if (reply.voucher_id != null) this.voucherId = reply.voucher_id
    } catch (e) {}
  }
}

/**
 * The provided authentication is incorrect.
 *
 * Reasons could include:
 * - Password login: wrong password
 * - PIN login: wrong PIN
 * - Recovery login: wrong answers
 *
 * The error object may include a `wait` member,
 * which is the number of seconds the user must wait before trying again.
 */
export class PasswordError extends Error {
  name: string
  +type: string // deprecated
  +wait: number | void // seconds

  constructor(resultsJson: mixed, message: string = 'Invalid password') {
    super(message)
    this.name = this.type = errorNames.PasswordError

    try {
      const clean = asPasswordErrorPayload(resultsJson)
      this.wait = clean.wait_seconds
    } catch (e) {}
  }
}

/**
 * Trying to spend funds that are not yet confirmed.
 */
export class PendingFundsError extends Error {
  name: string

  constructor(message: string = 'Not enough confirmed funds') {
    super(message)
    this.name = errorNames.PendingFundsError
  }
}

/**
 * Attempting to shape shift between two wallets of same currency.
 */
export class SameCurrencyError extends Error {
  name: string

  constructor(message: string = 'Wallets can not be the same currency') {
    super(message)
    this.name = errorNames.SameCurrencyError
  }
}

/**
 * Trying to swap an amount that is either too low or too high.
 * @param nativeMax the maximum supported amount, in the "from" currency.
 */
export class SwapAboveLimitError extends Error {
  name: string
  +pluginId: string
  +nativeMax: string

  constructor(swapInfo: EdgeSwapInfo, nativeMax: string) {
    super('Amount is too high')
    this.name = errorNames.SwapAboveLimitError
    this.pluginId = swapInfo.pluginId
    this.nativeMax = nativeMax
  }
}

/**
 * Trying to swap an amount that is either too low or too high.
 * @param nativeMin the minimum supported amount, in the "from" currency.
 */
export class SwapBelowLimitError extends Error {
  name: string
  +pluginId: string
  +nativeMin: string

  constructor(swapInfo: EdgeSwapInfo, nativeMin: string) {
    super('Amount is too low')
    this.name = errorNames.SwapBelowLimitError
    this.pluginId = swapInfo.pluginId
    this.nativeMin = nativeMin
  }
}

/**
 * The swap plugin does not support this currency pair.
 */
export class SwapCurrencyError extends Error {
  name: string
  +pluginId: string
  +fromCurrency: string
  +toCurrency: string

  constructor(
    swapInfo: EdgeSwapInfo,
    fromCurrency: string,
    toCurrency: string
  ) {
    super(
      `${swapInfo.displayName} does not support ${fromCurrency} to ${toCurrency}`
    )
    this.name = errorNames.SwapCurrencyError
    this.pluginId = swapInfo.pluginId
    this.fromCurrency = fromCurrency
    this.toCurrency = toCurrency
  }
}

type SwapPermissionReason =
  | 'geoRestriction'
  | 'noVerification'
  | 'needsActivation'

/**
 * The user is not allowed to swap these coins for some reason
 * (no KYC, restricted IP address, etc...).
 * @param reason A string giving the reason for the denial.
 * - 'geoRestriction': The IP address is in a restricted region
 * - 'noVerification': The user needs to provide KYC credentials
 * - 'needsActivation': The user needs to log into the service.
 */
export class SwapPermissionError extends Error {
  name: string
  +pluginId: string
  +reason: SwapPermissionReason | void

  constructor(swapInfo: EdgeSwapInfo, reason?: SwapPermissionReason) {
    if (reason != null) super(reason)
    else super('You are not allowed to make this trade')
    this.name = errorNames.SwapPermissionError
    this.pluginId = swapInfo.pluginId
    this.reason = reason
  }
}

/**
 * Cannot find a login with that id.
 *
 * Reasons could include:
 * - Password login: wrong username
 * - PIN login: wrong PIN key
 * - Recovery login: wrong username, or wrong recovery key
 */
export class UsernameError extends Error {
  name: string
  +type: string // deprecated

  constructor(message: string = 'Invalid username') {
    super(message)
    this.name = this.type = errorNames.UsernameError
  }
}
