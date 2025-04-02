# Aust's One-Click Node

## Sunsetting

> I built A1CN ~2 years ago for free and open-sourced it because there was a need in the community. Now that governance is over, and nodekit keeps improving, that need is no longer there.
>
> Therefore, I'm officially sunsetting A1CN.
> 
> For those currently using the app: you don't need to take immediate action. The app will continue to work for some time. However, when a new consensus upgrade comes out (i.e. p2p), then A1CN will no longer work. So whenever you have a spare weekend, you should migrate to nodekit.
> 
> Thanks for the memories.
>
> April 2nd, 2025

https://x.com/austp17/status/1907481612885086553

Aust's One-Click Node is an app for Mac, Windows, and Linux that makes it easy to spin up a node for Algorand or Voi and start participating in consensus.

<img width="1023" alt="Screen Shot 2023-08-03 at 9 08 44 AM" src="https://github.com/AustP/austs-one-click-node/assets/2007045/2718a551-b4cb-4725-9f83-ccd03bbd8c98">

## Installation

Head over to the [releases page](https://github.com/AustP/austs-one-click-node/releases) and download the file required by your operating system.

Mac builds are signed and notarized, so you shouldn't have any issue running them.

Windows builds are not signed because $500 is too much.
In order to run it, you'll need to click "More info" on the "Windows protected your PC" dialog.
Then click the "Run Anyway" button.
The code is open-source so you can review it yourself or have a trusted friend do so.

## Running Multiple Nodes

If you want to run a node for Algorand and Voi, you can launch another node from the Settings page. There is one quirk to be aware of:

The list of accounts is shared between the two instances.

What this means is that you will need to have your Algorand accounts and Voi accounts shared in the account list. The best way to do this is by adding all of your accounts as watch accounts. When you need to sign transactions, then you should connect your wallet and sign the transactions. When you're done, disconnect the wallet so it becomes a watch account again. If you follow this protocol, you should have no problems with this quirk.

## Signing Transactions With a Voi Account

Defly doesn't work with Voi. However, if you use [A-Wallet](https://a-wallet.net/) (an [open-source project](https://github.com/scholtz/wallet/), use at your own risk!), you can sign transactions. Here is the process:

1. Click the "Connect" button for Defly.
2. When the QR Code pops up, click it to copy the Wallet Connect URL.
3. In A-Wallet, go to the WalletConnect tab and click the "Initialize connection to Wallet Connect" button.
4. Paste the URL into the textbox and press the "Connect" button.

Now when you press the Go Online/Offline buttons, A-Wallet should prompt you to sign those transactions.

Thanks to APT, pk, and django.algo in Discord for sharing these instructions!
