Demo Script (Under 2 Minutes)

0:00–0:10
Hi! This wallet tracks coins called UTXOs. Think of UTXOs like digital cash bills. To pay someone, the wallet must pick which bills to use. That process is called coin selection.

0:10–0:25
I’ll load one fixture JSON in the UI and click Build Transaction. Now you can see the selected inputs here. These are the UTXOs the wallet chose because together they cover the payment amount and transaction fee.

0:25–0:40
On the outputs side, this payment output is money going to the receiver. This output marked CHANGE sends leftover funds back to the sender. Change exists so we don’t overpay the receiver.

0:40–0:52
If leftover amount is too tiny, it becomes dust. Dust outputs are unsafe or uneconomical because they cost more to spend later. In that case, the wallet avoids creating dust change and may add it to fee.

0:52–1:08
Here is fee rate, transaction size in vbytes, and total fee. Fee is based on size: bigger transactions use more block space, so they cost more. Adding a change output can increase size, which can increase fee.

1:08–1:20
If there is no change output, that means send-all behavior: the leftover value is consumed as extra fee instead of returning as change.

1:20–1:32
This PSBT field is the unsigned transaction package. PSBT means Partially Signed Bitcoin Transaction. It carries the unsigned transaction plus metadata needed for safe signing later.

1:32–1:45
RBF signaling is shown here. RBF means Replace-By-Fee: the sender can rebroadcast with a higher fee if confirmation is slow. Technically this is signaled by input nSequence values.

1:45–1:55
Locktime is shown when present. nLockTime can delay validity until a certain block height or timestamp.

1:55–2:00
Finally, warnings are listed here, such as HIGH_FEE, DUST_CHANGE, SEND_ALL, and RBF_SIGNALING, so users can spot safety or cost issues quickly.
