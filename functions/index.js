const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
var DateDiff = require('date-diff');
var moment = require('moment');
admin.initializeApp();
const db = admin.firestore();
const fs = require('fs');
var client;
var plaid = require('plaid');
const { response } = require('express');

// sandbox credentials
// fs.readFile('credentials.json', (err, content) => {
//     let tokens = JSON.parse(content);
//     client = new plaid.Client({
//         clientID: tokens.clientId,
//         secret: tokens.secret,
//         env: plaid.environments.sandbox
//     });
// live credentials
fs.readFile('credentials-production.json', (err, content) => {
    let tokens = JSON.parse(content);
    client = new plaid.Client({
        clientID: tokens.clientId,
        secret: tokens.secret,
        env: plaid.environments.development
    });
    const configuration = new Configuration({
        basePath: PlaidEnvironments.production,
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': tokens.clientId,
            'PLAID-SECRET': tokens.secret,
          },
        },
      });
      client = new PlaidApi(configuration);
});
// const STRIPE_PUBLISHABLE_KEY = 'pk_test_dJMZ29SybR1QIZ8uqwHpTz3U00n0xOb4iX';
const STRIPE_SECRET_KEY = 'sk_test_51FbtXSFwEoUsHGzfq1obM7Zm0QK5Sk8GbYK9XXqhZYayEpS7W4C7oYXWbncZ0tD0EEUPRd3dhEHgWwXfdJOqNh4c001sQSI4Ku';
const stripe = require('stripe')(STRIPE_SECRET_KEY);
const stripewebHooks = require('stripe')(functions.config().keys.webhooks);
const endpointSecret = functions.config().keys.signing;
DOMAIN = 'http://localhost:8100';
const BASIC_PRICE_ID = 'price_1KP49AFwEoUsHGzfwBE6mF30';

//validate Coupons
// exports.validateCoupon = functions.https.onRequest((req, res) => {
//     cors(req, res, () => {
//         const tokenId = req.get('Authorization').split('Bearer ')[1];

//         admin.auth().verifyIdToken(tokenId)
//             .then((decodedToken) => {
//                 stripe.coupons.retrieve(
//                     req.query.coupon
//                 ).then((coupons) => {
//                     console.log(coupons);
//                     return res.status(200).send({
//                         success: true,
//                         coupons: coupons,
//                     });
//                 }).catch((err) => {
//                     console.log(error);
//                     return res.status(400).send({
//                         success: false,
//                         error: error,
//                     });
//                 });
//             }).catch((error) => {
//                 console.log(error);
//                 return res.status(400).send({
//                     success: false,
//                     error: error,
//                 });
//             });
//     })
// });


function calculateDate(payPermonth, totalAmount, income) {
    return new Promise((resolve, reject) => {
        payPermonth = parseFloat(payPermonth);
        if (income.isRepeating) {
            if (income.repeating.type === "biweekly") {
                var date = getAchiveDateFormula(payPermonth, totalAmount, 14);
                resolve(date)
            }
            else if (income.repeating.type === "weekly") {
                var date = getAchiveDateFormula(payPermonth, totalAmount, 7);
                resolve(date)
            }
            else if (income.repeating.type === "semimonthly") {
                var date = getAchiveDateFormula(payPermonth, totalAmount, 15);
                resolve(date)
            }
            else if (income.repeating.type === "monthly") {
                var date = getAchiveDateFormula(payPermonth, totalAmount, 30);
                resolve(date)
            }
        }
        else {
            var date = getAchiveDateFormula(payPermonth, totalAmount, 30);
            resolve(date)
        }
    })
}
function calculateTarget(payPermonth, totalAmount, income) {
    return new Promise((resolve, reject) => {
        payPermonth = parseFloat(payPermonth);
        if (income.isRepeating) {
            if (income.repeating.type === "biweekly") {
                var date = getAchiveDebtDateFormula(payPermonth, totalAmount, 14);
                resolve(date)
            }
            else if (income.repeating.type === "weekly") {
                var date = getAchiveDebtDateFormula(payPermonth, totalAmount, 7);
                resolve(date)
            }
            else if (income.repeating.type === "semimonthly") {
                var date = getAchiveDebtDateFormula(payPermonth, totalAmount, 15);
                resolve(date)
            }
            else if (income.repeating.type === "monthly") {
                var date = getAchiveDebtDateFormula(payPermonth, totalAmount, 30);
                resolve(date)
            }
        }
        else {
            var date = getAchiveDebtDateFormula(payPermonth, totalAmount, 30);
            resolve(date)
        }
    })
}
function getAchiveDateFormula(payPermonth, totalAmount, type) {
    if (payPermonth && totalAmount) {
        let totalTime = totalAmount / payPermonth;
        let typeRecurresion = Math.floor(totalTime);
        if (totalTime - typeRecurresion != 0) {
            typeRecurresion = typeRecurresion + 1;
        }
        var date = new Date().setDate(new Date().getDate() + ((typeRecurresion * type)));
        return date > 0 ? new Date(date) : new Date();
    }
    else {
        return new Date();
    }
}
function getAchiveDebtDateFormula(payPermonth, totalAmount, type) {
    if (payPermonth && totalAmount) {
        let totalTime = totalAmount / payPermonth;
        let typeRecurresion = Math.floor(totalTime);
        if (totalTime - typeRecurresion != 0) {
            typeRecurresion = typeRecurresion + 1;
        }
        var date = new Date().setDate(new Date().getDate() + ((typeRecurresion * type)));
        return date > 0 ? new Date(date) : new Date();
    }
    else {
        return new Date();
    }
}
function getDayDiifer(type) {
    if (type == "monthly") {
        return 30;
    }
    else if (type == "semimonthly") {
        return 15;
    }
    else if (type == "biweekly") {
        return 14;
    }
    else if (type == "weekly") {
        return 7;
    }
    else {
        return 30;
    }
}

// rollover history to manage the budget allocations problem in our data base;
// rolloverBudgetTemplate = [{
//  "category": i.category,
// "category_id": i.category_id,
// "budgeted": existingpaycheckBudgetDetails[eIndex].available,
// "spent": 0,
// "available": existingpaycheckBudgetDetails[eIndex].available,
// "transactions": []
// }]

exports.assignTransaction = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        const data = request.body;
        let error = [];

        if (data.assignment.length == 0) {
            return res.status(200).send({
                success: true,
                message: "no data"
            });
        }
        transRef = admin.firestore().collection("user_transaction").doc(data.userId).collection("transactions").doc(data.transactionId);
        incomeRef = admin.firestore().collection("income_source").doc(data.userId).collection("incomes");
        transRef.get().then((transData) => {
            transRef.update({
                assignment: admin.firestore.FieldValue.arrayUnion(...data.assignment)
            }).then((snapTrans) => {
                let count = 0;
                let transId = transRef.id;
                updatePaycheks(data.assignment[count], transId);

                function updatePaycheks(i, transId) {
                    incomeRef.where("paycheckIds", "array-contains", i.paycheckId).get().then((snap) => {
                        if (snap.docs.length === 0) {
                            error.push(`paycheck id not exists: ${i.paycheckId}`);
                            count++;
                            if (count == data.assignment.length) {
                                return response.status(200).send({
                                    success: true,
                                    message: error
                                });
                            } else {
                                updatePaycheks(data.assignment[count], transId);
                            }
                        } else {
                            let incomeSourceId = snap.docs[0].id;
                            let incomeSourceData = snap.docs[0].data();
                            let paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(i.paycheckId);
                            paycheckGet.get().then((snapPayCheckReq) => {
                                var paycheckData = snapPayCheckReq.data();
                                let existingBudgetDetails = paycheckData.budgetDetails;
                                let index = existingBudgetDetails.findIndex(o => (o.category.replace(/[^\w\s]/gi, '')) == (transData.data().category.replace(/[^\w\s]/gi, '')));
                                if (index != -1) {
                                    let transactions = [];
                                    transactions = existingBudgetDetails[index].transactions;
                                    transactions.push(transId);
                                    existingBudgetDetails[index].spent = existingBudgetDetails[index].spent + i.amount;
                                    existingBudgetDetails[index].available = existingBudgetDetails[index].available - i.amount;
                                    existingBudgetDetails[index].transactions = transactions;
                                } else {
                                    existingBudgetDetails.push({
                                        "category": transData.data().category,
                                        "budgeted": 0,
                                        "spent": i.amount,
                                        "available": -i.amount,
                                        "transactions": [transId]
                                    })
                                }
                                paycheckGet.update({
                                    budgetDetails: existingBudgetDetails,
                                    budgetsAvailable: paycheckData.budgetsAvailable - i.amount,
                                    isOverspent: (paycheckData.budgetsAvailable - i.amount) < 0 ? true : false
                                }).then(out => {
                                    count++;
                                    if (count == data.assignment.length) {
                                        return response.status(200).send({
                                            success: true,
                                            message: error
                                        });

                                    } else {
                                        updatePaycheks(data.assignment[count], transId);

                                    }

                                })
                            })
                        }
                    })
                }
            }).catch((err) => {
                response.status(400).send({
                    succes: false,
                    message: JSON.stringify(err)
                });

            })
        });
    })
});

exports.addAccount = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        var acc = request.body.accounts;
        const token = request.body.token;
        const userId = request.body.uid;
        admin.firestore().collection('accounts').doc(userId).set({ active: true })
        let refDoc = admin.firestore().collection('accounts').doc(userId).collection('bank_account');
        acc.forEach(function (account, index) {
            account.lastFour = account.account_id.substr(account.account_id.length - 4);
            account.accounts_tokens = token;
            refDoc.doc(account.account_id).set(account).then(function (respo) {
                if ((acc.length - 1) === index) {
                    response.status(200).send({
                        success: true,
                        res: respo
                    });
                }
            }).catch(function (error) {
                response.status(400).send({
                    success: false,
                    error: error
                });
            });
        });
    })
});

exports.addIncomeSource = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        const data = req.body;
        let payDate = [];
        var lastDate = new Date(data.startDate); // 11 nov
        var nextDate = new Date(new Date().setMonth(new Date().getMonth() + 1)); // 11 dec
        var diff = new DateDiff(nextDate, lastDate);
        var numDays = parseInt(diff.days());
        var numMonth = diff.months();
        var totalPaychecksReccured = 0;
        if (data.isRepeating && (data.repeatingType == 'monthly' ||
            data.repeatingType == 'semimonthly' || data.repeatingType == 'biweekly' ||
            data.repeatingType == 'weekly')) {
            if (data.repeatingType == 'weekly') {
                totalPaychecksReccured = parseFloat(Math.abs(numDays / 7));
                if (numDays % 7 == 0) {
                    totalPaychecksReccured = totalPaychecksReccured + 1;
                }
                if (totalPaychecksReccured > 0) {
                    for (var i = 0; i < Math.ceil(totalPaychecksReccured); i++) {
                        console.log(i, totalPaychecksReccured);
                        payDate.push(new Date(new Date(data.startDate).setDate(new Date(data.startDate).getDate() + (7 * (i + 1)) - 7)));
                    }
                }
                if (totalPaychecksReccured == 0) {
                    payDate.push(new Date(new Date(data.startDate).setDate(new Date(data.startDate).getDate())));
                }
            }
            if (data.repeatingType == 'biweekly') {
                totalPaychecksReccured = parseFloat(Math.abs(numDays / 14));
                if (numDays % 14 == 0) {
                    totalPaychecksReccured = totalPaychecksReccured + 1;
                }
                if (totalPaychecksReccured > 0) {
                    for (var i = 0; i < Math.ceil(totalPaychecksReccured); i++) {
                        payDate.push(new Date(new Date(data.startDate).setDate(new Date(data.startDate).getDate() + (14 * (i + 1)) - 14)));
                    }
                }
                else {
                    payDate.push(new Date(new Date(data.startDate).setDate(new Date(data.startDate).getDate() + (14 * 1) - 14)));
                }
            }
            if (data.repeatingType == 'monthly') {
                totalPaychecksReccured = parseFloat(Math.abs(numDays / 30));
                if (totalPaychecksReccured > 0) {
                    for (var i = 0; i <= parseInt(totalPaychecksReccured); i++) {
                        if (data.weeks && data.weeks != null) {
                            firstWeekOfDate = getDateofWeek(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate()), data.weeks.weekDays);
                            let weekNumber = data.weeks.weekNumber[0];
                            payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * weekNumber) - 7)));
                        } else {
                            firstWeekOfDate = getDateofWeek(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate()), 0);
                            payDate.push(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate()));
                        }
                    }
                }
                else {
                    firstWeekOfDate = getDateofWeek(new Date(data.startDate), 0);
                    payDate.push(new Date(data.startDate));

                }
            }
            if (data.repeatingType == 'semimonthly') {
                if (numMonth > 0) {
                    for (var i = 0; i < Math.ceil(numMonth); i++) {
                        if (data.weeks.dateFormat === 'weekly') {
                            data.weeks.weekNumber.forEach(function (weeknum) {
                                firstWeekOfDate = getDateofWeek(new Date(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate())), data.weeks.weekDays);
                                payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * weeknum) - 7)));
                            })
                        }
                        else {
                            data.weeks.monthDays.forEach(function (dayNum) {
                                var currentDate = new Date(new Date(new Date(new Date().setFullYear(lastDate.getFullYear())).setMonth(lastDate.getMonth() + i)).setDate(lastDate.getDate()));
                                payDate.push(new Date(currentDate.setDate(dayNum)));
                            })
                        }
                    }
                }
                else {
                    if (data.weeks.dateFormat === 'weekly') {
                        data.weeks.weekNumber.forEach(function (weeknum) {
                            firstWeekOfDate = getDateofWeek(new Date(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate())), data.weeks.weekDays);
                            payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * weeknum) - 7)));
                        })
                    }
                    else {
                        data.weeks.monthDays.forEach(function (dayNum) {
                            var currentDate = new Date(lastDate.setMonth(lastDate.getMonth() + i));
                            payDate.push(new Date(currentDate.setDate(dayNum)));
                        })
                    }
                }
            }
        }
        else {
            payDate.push(new Date(data.startDate));
        }
        var incomeRef = admin.firestore().collection("income_source").doc(data.userId).collection("incomes");
        incomeRef.add({
            "name": data.name,
            "isRepeating": data.isRepeating,
            "repeating": data.isRepeating ? {
                "type": data.repeatingType,
                "payDays": payDate,//payDays[data.repeatingType.toLowerCase()],
            } : null,
            "weeks": data.isRepeating && ((data.repeatingType == 'monthly' && data.weeks) ||
                data.repeatingType == 'semimonthly') ? data.weeks : null,
            "startDate": new Date(data.startDate),
            "mergedIncome": [],
            "startDateTimeStamp": new Date(data.startDate).getTime(),
            "budgetTemplate": {
                "totalExpected": data.income,
                "budgetsToBeBudgeted": data.income,
                "budgetTemplateDetails": []
            },
        }).then(function (incomeResult) {
            let promises = [];
            admin.firestore().collection("income_source").doc(data.userId).set({ active: true });
            var payChecksRef = incomeRef.doc(incomeResult.id).collection("paychecks");
            console.log(payDate);
            for (var i = 0; i < payDate.length; i++) {
                var paychecksArray = [];
                payChecksRef.get().then((snapshot) => {
                    if (snapshot.docs.length) {
                        paychecksArray = snapshot.docs.map(o => o.data());
                    }
                })
                if (paychecksArray.length) {
                    if (!paychecksArray.some(el => el.payDateTimeStamp >= payDate[i].getTime())) {
                        let promise = payChecksRef.add(
                            {
                                "name": `${payDate[i].toLocaleDateString()} paycheck`,
                                "payDate": payDate[i],
                                "surplusBudgetTemplate": [],
                                "payDateTimeStamp": payDate[i].getTime(),
                                "totalExpected": data.income,
                                "totalReceived": 0,
                                "receivedPaycheckTransaction": [],
                                "budgetsToBeBudgeted": data.income,
                                "budgetsCurrent": 0,
                                "budgetsAvailable": data.income,
                                "isOverbudget": false,
                                "isOverspent": false,
                                "budgetDetails": [],
                                "rolloverBudgetTemplate": []
                            })
                        promises.push(promise);
                    }
                }
                else {
                    let promise = payChecksRef.add(
                        {
                            "name": `${payDate[i].toLocaleDateString()} paycheck`,
                            "payDate": payDate[i],
                            "surplusBudgetTemplate": [],
                            "payDateTimeStamp": payDate[i].getTime(),
                            "totalExpected": data.income,
                            "totalReceived": 0,
                            "receivedPaycheckTransaction": [],
                            "budgetsToBeBudgeted": data.income,
                            "budgetsCurrent": 0,
                            "budgetsAvailable": data.income,
                            "isOverbudget": false,
                            "isOverspent": false,
                            "budgetDetails": [],
                            "rolloverBudgetTemplate": []
                        })
                    promises.push(promise);
                }

            }
            Promise.all(promises).then((result) => {
                let paychecksIds = [];
                result.forEach(function (out) {
                    paychecksIds.push(out.id);
                });
                incomeRef.doc(incomeResult.id).update({ "paycheckIds": paychecksIds }).then(function (result) {
                    res.status(200).send({
                        success: true,
                        incomeSourceId: incomeResult.id
                    });

                });
            })
        }).catch(function (error) {
            console.log(`logLevel:1, ${error}`);
            res.status(400).send({
                success: false,
                logLevel: 1,
                error: JSON.stringify(error)
            });

        });
        function getDateofWeek(startDate, days) {
            let date = moment().set('year', startDate.getFullYear()).set('month', startDate.getMonth()).set('date', 1);
            let firstDay = moment().set('year', startDate.getFullYear()).set('month', startDate.getMonth()).set('date', 1).weekday();
            if (firstDay == days) {
                return new Date(date)
            } else {
                let b = (days - firstDay);
                if (b > 0) {
                    return new Date(date.add(b, 'days'));
                } else {
                    let c = 7 - Math.abs(b);
                    return new Date(date.add(c, 'days'));
                }
            }
        }

    });
});

exports.addIncomeSourceTest = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        const data = req.body;
        let payDate = [];
        var lastDate = new Date(data.startDate); // 11 nov
        var nextDate = new Date(new Date().setDate(new Date().getDate() - 1)); // 11 dec
        var diff = new DateDiff(nextDate, lastDate);
        var numDays = parseInt(diff.days());
        var numMonth = diff.months();
        var totalPaychecksReccured = 0;
        if (data.isRepeating && (data.repeatingType == 'monthly' ||
            data.repeatingType == 'semimonthly' || data.repeatingType == 'biweekly' ||
            data.repeatingType == 'weekly')) {
            if (data.repeatingType == 'weekly') {
                totalPaychecksReccured = parseFloat(Math.abs(numDays / 7));
                if (numDays % 7 == 0) {
                    totalPaychecksReccured = totalPaychecksReccured + 1;
                }
                if (totalPaychecksReccured > 0) {
                    for (var i = 0; i < Math.ceil(totalPaychecksReccured); i++) {
                        // console.log(i, totalPaychecksReccured);//Ray Changes
                        payDate.push(new Date(new Date(data.startDate).setDate(new Date(data.startDate).getDate() + (7 * (i + 1)) - 7)));
                    }
                }
                if (totalPaychecksReccured == 0) {
                    payDate.push(new Date(new Date(data.startDate).setDate(new Date(data.startDate).getDate())));
                }
            }
            if (data.repeatingType == 'biweekly') {
                totalPaychecksReccured = parseFloat(Math.abs(numDays / 14));
                if (numDays % 14 == 0) {
                    totalPaychecksReccured = totalPaychecksReccured + 1;
                }
                if (totalPaychecksReccured > 0) {
                    for (var i = 0; i < Math.ceil(totalPaychecksReccured); i++) {
                        payDate.push(new Date(new Date(data.startDate).setDate(new Date(data.startDate).getDate() + (14 * (i + 1)) - 14)));
                    }
                }
                else {
                    payDate.push(new Date(new Date(data.startDate).setDate(new Date(data.startDate).getDate() + (14 * 1) - 14)));
                }
            }
            if (data.repeatingType == 'monthly') {
                totalPaychecksReccured = parseFloat(Math.abs(numDays / 30));
                if (totalPaychecksReccured > 0) {
                    for (var i = 0; i <= parseInt(totalPaychecksReccured); i++) {
                        if (data.weeks && data.weeks != null) {
                            firstWeekOfDate = getDateofWeek(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate()), data.weeks.weekDays);
                            let weekNumber = data.weeks.weekNumber[0];
                            payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * weekNumber) - 7)));
                        } else {
                            firstWeekOfDate = getDateofWeek(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate()), 0);
                            payDate.push(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate()));
                        }
                    }
                }
                else {
                    firstWeekOfDate = getDateofWeek(new Date(data.startDate), 0);
                    payDate.push(new Date(data.startDate));

                }
            }
            if (data.repeatingType == 'semimonthly') {
                if (numMonth > 0) {
                    for (var i = 0; i < Math.ceil(numMonth); i++) {
                        if (data.weeks.dateFormat === 'weekly') {
                            data.weeks.weekNumber.forEach(function (weeknum) {
                                firstWeekOfDate = getDateofWeek(new Date(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate())), data.weeks.weekDays);
                                payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * weeknum) - 7)));
                            })
                        }
                        else {
                            data.weeks.monthDays.forEach(function (dayNum) {
                                var currentDate = new Date(new Date(new Date(new Date().setFullYear(lastDate.getFullYear())).setMonth(lastDate.getMonth() + i)).setDate(lastDate.getDate()));
                                payDate.push(new Date(currentDate.setDate(dayNum)));
                            })
                        }
                    }
                }
                else {
                    if (data.weeks.dateFormat === 'weekly') {
                        data.weeks.weekNumber.forEach(function (weeknum) {
                            firstWeekOfDate = getDateofWeek(new Date(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate())), data.weeks.weekDays);
                            payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * weeknum) - 7)));
                        })
                    }
                    else {
                        data.weeks.monthDays.forEach(function (dayNum) {
                            var currentDate = new Date(lastDate.setMonth(lastDate.getMonth() + i));
                            payDate.push(new Date(currentDate.setDate(dayNum)));
                        })
                    }
                }
            }
        }
        else {
            payDate.push(new Date(data.startDate));
        }
        var incomeRef = admin.firestore().collection("income_source").doc(data.userId).collection("incomes");
        incomeRef.add({
            "name": data.name,
            "isRepeating": data.isRepeating,
            "repeating": data.isRepeating ? {
                "type": data.repeatingType,
                "payDays": payDate,//payDays[data.repeatingType.toLowerCase()],
            } : null,
            "weeks": data.isRepeating && ((data.repeatingType == 'monthly' && data.weeks) ||
                data.repeatingType == 'semimonthly') ? data.weeks : null,
            "startDate": new Date(data.startDate),
            "mergedIncome": [],
            "startDateTimeStamp": new Date(data.startDate).getTime(),
            "budgetTemplate": {
                "totalExpected": data.income,
                "budgetsToBeBudgeted": data.income,
                "budgetTemplateDetails": []
            },
        }).then(function (incomeResult) {
            let promises = [];
            admin.firestore().collection("income_source").doc(data.userId).set({ active: true });
            var payChecksRef = incomeRef.doc(incomeResult.id).collection("paychecks");
            console.log(payDate);
            for (var i = 0; i < payDate.length; i++) {
                var paychecksArray = [];
                payChecksRef.get().then((snapshot) => {
                    if (snapshot.docs.length) {
                        paychecksArray = snapshot.docs.map(o => o.data());
                    }
                })
                if (paychecksArray.length) {
                    if (!paychecksArray.some(el => el.payDateTimeStamp >= payDate[i].getTime())) {
                        let promise = payChecksRef.add(
                            {
                                "name": `${payDate[i].toLocaleDateString()} paycheck`,
                                "payDate": payDate[i],
                                "surplusBudgetTemplate": [],
                                "payDateTimeStamp": payDate[i].getTime(),
                                "totalExpected": data.income,
                                "totalReceived": 0,
                                "receivedPaycheckTransaction": [],
                                "budgetsToBeBudgeted": data.income,
                                "budgetsCurrent": 0,
                                "budgetsAvailable": data.income,
                                "isOverbudget": false,
                                "isOverspent": false,
                                "budgetDetails": [],
                                "rolloverBudgetTemplate": []
                            })
                        promises.push(promise);
                    }
                }
                else {
                    let promise = payChecksRef.add(
                        {
                            "name": `${payDate[i].toLocaleDateString()} paycheck`,
                            "payDate": payDate[i],
                            "surplusBudgetTemplate": [],
                            "payDateTimeStamp": payDate[i].getTime(),
                            "totalExpected": data.income,
                            "totalReceived": 0,
                            "receivedPaycheckTransaction": [],
                            "budgetsToBeBudgeted": data.income,
                            "budgetsCurrent": 0,
                            "budgetsAvailable": data.income,
                            "isOverbudget": false,
                            "isOverspent": false,
                            "budgetDetails": [],
                            "rolloverBudgetTemplate": []
                        })
                    promises.push(promise);
                }

            }
            Promise.all(promises).then((result) => {
                let paychecksIds = [];
                result.forEach(function (out) {
                    paychecksIds.push(out.id);
                });
                incomeRef.doc(incomeResult.id).update({ "paycheckIds": paychecksIds }).then(function (result) {
                    res.status(200).send({
                        success: true,
                        incomeSourceId: incomeResult.id
                    });

                });
            })
        }).catch(function (error) {
            // console.log(`logLevel:1, ${error}`);//Ray Changes
            res.status(400).send({
                success: false,
                logLevel: 1,
                error: JSON.stringify(error)
            });

        });
        function getDateofWeek(startDate, days) {
            let date = moment().set('year', startDate.getFullYear()).set('month', startDate.getMonth()).set('date', 1);
            let firstDay = moment().set('year', startDate.getFullYear()).set('month', startDate.getMonth()).set('date', 1).weekday();
            if (firstDay == days) {
                return new Date(date)
            } else {
                let b = (days - firstDay);
                if (b > 0) {
                    return new Date(date.add(b, 'days'));
                } else {
                    let c = 7 - Math.abs(b);
                    return new Date(date.add(c, 'days'));
                }
            }
        }

    });
});

exports.addIncomesourceToExisting = functions.https.onRequest((request, responses) => {
    cors(request, responses, () => {
        const params = request.body.params;
        const slectedIncome = request.body.slectedIncome;
        const data = request.body.data;
        addIncomeSource(params).then((datesRes) => {
            console.log("response after date calculation", JSON.stringify(datesRes.date));
            if (datesRes.date.length && slectedIncome) {
                const payDates = datesRes.date;
                const dayDifference = datesRes.dayDifferance;
                var mergedIncome = [];
                var paycheckDates = [];
                const incomeRef = admin.firestore().collection('income_source').doc(params.userId).collection('incomes').doc(slectedIncome);
                let count = 0;
                updatePaycheckBudget(payDates[count])
                function updatePaycheckBudget(start_Date) {
                    count++;
                    if (start_Date) {
                        incomeRef.get().then((snapShots) => {
                            var assignIncomeSource = Object.assign({ id: snapShots.id }, { paychecks: [] }, snapShots.data());
                            const repeatingType = getDayDiifer(assignIncomeSource.repeating.type);
                            console.log(repeatingType);
                            incomeRef.collection('paychecks').get().then((paySnap) => {
                                paySnap.docs.map(o => assignIncomeSource.paychecks.push(Object.assign({ id: o.id }, o.data())));
                                if (assignIncomeSource && assignIncomeSource.paychecks.length) {
                                    var filteredPaychecks = [];
                                    mergedIncome = assignIncomeSource.mergedIncome;
                                    assignIncomeSource.paychecks.forEach((o, index) => {
                                        if (new Date(o.payDate.toDate().toLocaleDateString()).getTime() <= new Date(start_Date).getTime()) {
                                            let diff = new DateDiff(start_Date, new Date(o.payDate.toDate().toLocaleDateString()));
                                            let days = diff.days();
                                            console.log(start_Date, days, dayDifference, repeatingType)
                                            if (days <= dayDifference && days <= repeatingType) {
                                                if (days === repeatingType && assignIncomeSource.repeating.type === 'weekly' && (data.paycheckFrequency === 'biweekly' || data.paycheckFrequency === 'semimonthly')) {
                                                    console.log("isnt possible right now???????")
                                                }
                                                else {
                                                    filteredPaychecks.push(o);
                                                }
                                            }
                                        }
                                        if (assignIncomeSource.paychecks.length - 1 === index && filteredPaychecks.length) {
                                            filteredPaychecks = filteredPaychecks.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp);
                                            var add_income = [];
                                            if (filteredPaychecks[0].add_incomes) {
                                                add_income = filteredPaychecks[0].add_incomes;
                                            }
                                            var totalReceived = filteredPaychecks[0].totalReceived === 0 ? filteredPaychecks[0].totalExpected : filteredPaychecks[0].totalReceived;
                                            var totalspentAmount = filteredPaychecks[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                return a + b;
                                            }, 0);
                                            var totalBudgetAmount = filteredPaychecks[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                return a + b;
                                            }, 0);
                                            var budgetsAvailable = totalReceived - totalspentAmount + data.payAmount;
                                            var budgetsToBeBudgeted = totalReceived - totalBudgetAmount + data.payAmount;
                                            var totalExpected = filteredPaychecks[0].totalExpected + data.payAmount;
                                            var incometotalExpected = assignIncomeSource.budgetTemplate.totalExpected + data.payAmount;
                                            var incomeBudgeted = assignIncomeSource.budgetTemplate.budgetsToBeBudgeted + data.payAmount;
                                            var isExists = [];
                                            if (add_income.length) {
                                                isExists = add_income.filter(o => o.income == data.payAmount && o.name == data.paycheckName && o.repeatingType == data.paycheckFrequency);
                                                if (isExists.length == 0) {
                                                    add_income.push({
                                                        "name": data.paycheckName,
                                                        "isRepeating": data.incomeType == "recurring" ? true : false,
                                                        "repeatingType": data.paycheckFrequency,
                                                        "startDate": `${start_Date.getFullYear()}-${start_Date.getMonth() + 1}-${start_Date.getDate()}`,
                                                        "income": data.payAmount,
                                                    })
                                                }
                                            }
                                            else {
                                                add_income.push({
                                                    "name": data.paycheckName,
                                                    "isRepeating": data.incomeType == "recurring" ? true : false,
                                                    "repeatingType": data.paycheckFrequency,
                                                    "startDate": `${start_Date.getFullYear()}-${start_Date.getMonth() + 1}-${start_Date.getDate()}`,
                                                    "income": data.payAmount,
                                                })
                                            }
                                            if (data.incomeType == "recurring" && count === payDates.length) {
                                                mergedIncome.push({
                                                    "name": data.paycheckName,
                                                    "isRepeating": data.incomeType == "recurring" ? true : false,
                                                    "repeatingType": data.paycheckFrequency,
                                                    "startDate": data.payDate,
                                                    "income": data.payAmount,
                                                    "dayDifference": dayDifference,
                                                    "payDates": [],
                                                    "weeks": data.paycheckFrequency == 'semimonthly' ? params.weeks : null
                                                });
                                                mergedIncome = mergedIncome.reduce(
                                                    (accumulator, current) => {
                                                        if (!accumulator.some(x => (x.name === current.name && x.payDateTimeStamp === current.payDateTimeStamp))) {
                                                            accumulator.push(current)
                                                        }
                                                        return accumulator;
                                                    }, []
                                                );
                                            }
                                            if (data.incomeType == "recurring") {
                                                var param = {
                                                    mergedIncome: mergedIncome,
                                                    incometotalExpected: incometotalExpected,
                                                    incomeBudgeted: incomeBudgeted,
                                                    budgetTemplateDetails: assignIncomeSource.budgetTemplate.budgetTemplateDetails,
                                                    id: filteredPaychecks[0].id,
                                                    budgetsAvailable: budgetsAvailable,
                                                    payDate: filteredPaychecks[0].payDate,
                                                    totalExpected: totalExpected,
                                                    budgetsToBeBudgeted: budgetsToBeBudgeted,
                                                    add_income: add_income,
                                                    incomeId: slectedIncome,
                                                    payDateTimeStamp: filteredPaychecks[0].payDateTimeStamp
                                                }
                                                updateIncome(param);
                                            }
                                            if (data.incomeType != "recurring") {
                                                var param = {
                                                    mergedIncome: mergedIncome,
                                                    incometotalExpected: incometotalExpected,
                                                    incomeBudgeted: incomeBudgeted,
                                                    budgetTemplateDetails: assignIncomeSource.budgetTemplate.budgetTemplateDetails,
                                                    id: filteredPaychecks[0].id,
                                                    budgetsAvailable: budgetsAvailable,
                                                    totalExpected: totalExpected,
                                                    payDate: filteredPaychecks[0].payDate,
                                                    budgetsToBeBudgeted: budgetsToBeBudgeted,
                                                    add_income: add_income,
                                                    incomeId: slectedIncome,
                                                    payDateTimeStamp: filteredPaychecks[0].payDateTimeStamp
                                                }
                                                updateIncome(param);
                                            }
                                            function updateIncome(dataEle) {
                                                incomeRef.collection('paychecks').doc(dataEle.id).update({
                                                    budgetsAvailable: dataEle.budgetsAvailable,
                                                    totalExpected: dataEle.totalExpected,
                                                    budgetsToBeBudgeted: dataEle.budgetsToBeBudgeted,
                                                    add_incomes: dataEle.add_income
                                                }).then(() => {
                                                    paycheckDates.push(dataEle.payDate);
                                                    function updateMostrecent() {
                                                        //  resolve section

                                                        responses.status(200).send({
                                                            success: true,
                                                            message: "added Income into the income sources"
                                                        })
                                                    }
                                                    var Mostrecent = [];
                                                    incomeRef.collection('paychecks').get().then((snapDocs) => {
                                                        if (snapDocs.docs.length) {
                                                            snapDocs.docs.filter(o => {
                                                                if (o.data().payDateTimeStamp > dataEle.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                                    Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                                                    Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                                    return;
                                                                }
                                                            });
                                                            if (Mostrecent.length) {
                                                                var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                                                var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                    return a + b;
                                                                }, 0);
                                                                incomeRef.collection("paychecks").doc(Mostrecent[0].id).update({
                                                                    "budgetsAvailable": recentReceived - recentspentAmount,
                                                                    "isOverspent": (recentReceived - recentspentAmount) < 0 ? true : false
                                                                })
                                                                if (count === payDates.length) {
                                                                    if (dataEle.mergedIncome.length && data.incomeType == "recurring") {
                                                                        dataEle.mergedIncome[dataEle.mergedIncome.length - 1].payDates = paycheckDates;
                                                                        incomeRef.update({
                                                                            "mergedIncome": dataEle.mergedIncome.length ? dataEle.mergedIncome : [],
                                                                        }).then(() => {
                                                                            updateMostrecent();
                                                                        }).catch(() => {
                                                                            updateMostrecent();
                                                                        });
                                                                    }
                                                                    else {
                                                                        updateMostrecent();
                                                                    }

                                                                }
                                                                else {
                                                                    updatePaycheckBudget(payDates[count]);
                                                                }
                                                            }
                                                            else {
                                                                if (count === payDates.length) {
                                                                    if (dataEle.mergedIncome.length && data.incomeType == "recurring") {
                                                                        dataEle.mergedIncome[dataEle.mergedIncome.length - 1].payDates = paycheckDates;
                                                                        incomeRef.update({
                                                                            "mergedIncome": dataEle.mergedIncome.length ? dataEle.mergedIncome : [],
                                                                        }).then(() => {
                                                                            updateMostrecent();
                                                                        }).catch(() => {
                                                                            updateMostrecent();
                                                                        });
                                                                    }
                                                                    else {
                                                                        updateMostrecent();
                                                                    }
                                                                }
                                                                else {
                                                                    updatePaycheckBudget(payDates[count]);
                                                                }
                                                            }
                                                        }
                                                        else {
                                                            if (count === payDates.length) {
                                                                if (dataEle.mergedIncome.length && data.incomeType == "recurring") {
                                                                    dataEle.mergedIncome[dataEle.mergedIncome.length - 1].payDates = paycheckDates;
                                                                    incomeRef.update({
                                                                        "mergedIncome": dataEle.mergedIncome.length ? dataEle.mergedIncome : [],
                                                                    }).then(() => {
                                                                        updateMostrecent();
                                                                    }).catch(() => {
                                                                        updateMostrecent();
                                                                    });
                                                                }
                                                                else {
                                                                    updateMostrecent();
                                                                }
                                                            }
                                                            else {
                                                                updatePaycheckBudget(payDates[count]);
                                                            }
                                                        }
                                                    });
                                                }).catch((err) => {
                                                    if (count === payDates.length) {
                                                        //  resolve section
                                                        responses.status(200).send({
                                                            success: true,
                                                            message: "added Income into the income sources"
                                                        })
                                                    }
                                                    else {
                                                        updatePaycheckBudget(payDates[count]);
                                                    }
                                                })
                                            }
                                        }
                                        else if (assignIncomeSource.paychecks.length - 1 === index && filteredPaychecks.length == 0) {
                                            if (count === payDates.length) {
                                                mergedIncome.push({
                                                    "name": data.paycheckName,
                                                    "isRepeating": data.incomeType == "recurring" ? true : false,
                                                    "repeatingType": data.paycheckFrequency,
                                                    "startDate": data.payDate,
                                                    "income": data.payAmount,
                                                    "dayDifference": dayDifference,
                                                    "payDates": paycheckDates.length ? paycheckDates : [],
                                                    "weeks": data.paycheckFrequency == 'semimonthly' ? params.weeks : null
                                                });
                                                incomeRef.update({
                                                    "mergedIncome": mergedIncome
                                                })
                                                // resolve section
                                                responses.status(200).send({
                                                    success: true,
                                                    message: "added Income into the income sources"
                                                })
                                            }
                                            else {
                                                updatePaycheckBudget(payDates[count]);
                                            }

                                        }

                                    });
                                }
                                else {
                                    console.log("assigned income length is zero");
                                    responses.status(400).send({
                                        succes: false,
                                        message: "assigned income length is zero"
                                    })

                                }
                            }).catch((err) => {
                                console.log("paycheck", err)
                                responses.status(400).send({
                                    succes: false,
                                    message: "Error While getting paychecks :("
                                })
                            });

                        }).catch((err) => {
                            console.log("income", err)
                            responses.status(400).send({
                                succes: false,
                                message: "Error While getting Income :("
                            })
                        });
                    }
                    else {
                        updatePaycheckBudget(payDates[count]);
                    }
                }
            }
            else {
                responses.status(200).send({
                    success: false,
                    message: "No Dates For the given income"
                })
            }
        }).catch((error) => {
            console.log("error while generating the dates", error)
            responses.status(400).send({
                success: false,
                message: "Error While Generating Dates"
            })
        })
        function addIncomeSource(args) {
            return new Promise((resolve, reject) => {
                let payDate = [];
                var lastDate = new Date(args.payDate); // 11 nov
                var nextDate = new Date(new Date(new Date().setDate(new Date(args.payDate).getDate())).setMonth(new Date().getMonth() + 1)); // 11 dec
                var dayDifferance = 30;
                var diff = new DateDiff(nextDate, lastDate);
                var numDays = parseInt(diff.days().toString());
                var numMonth = parseInt(diff.months().toString());
                var totalPaychecksReccured = 0;
                if (args.isRepeating && (args.repeatingType == 'monthly' ||
                    args.repeatingType == 'semimonthly' || args.repeatingType == 'biweekly' ||
                    args.repeatingType == 'weekly')) {
                    if (args.repeatingType == 'weekly') {
                        dayDifferance = 7;
                        totalPaychecksReccured = parseInt((numDays / 7).toString());
                        if (numDays % 7 != 0) {
                            totalPaychecksReccured = totalPaychecksReccured + 1;
                        }
                        if (totalPaychecksReccured > 0) {
                            for (var i = 0; i < Math.ceil(totalPaychecksReccured); i++) {
                                payDate.push(new Date(new Date(args.payDate).setDate(new Date(args.payDate).getDate() + (7 * (i + 1)) - 7)));
                                if (payDate.length >= totalPaychecksReccured) {
                                    console.log("date length", payDate.length);
                                    resolve({ date: payDate, dayDifferance: dayDifferance });
                                }
                            }
                        }
                        else {
                            payDate.push(new Date(new Date(args.payDate).setDate(new Date(args.payDate).getDate())));
                            console.log("date length", payDate.length);
                            resolve({ date: payDate, dayDifferance: dayDifferance });
                        }
                    }
                    if (args.repeatingType == 'biweekly') {
                        dayDifferance = 14;
                        totalPaychecksReccured = parseInt((numDays / 14).toString());
                        totalPaychecksReccured = totalPaychecksReccured + 1;
                        if (totalPaychecksReccured > 0) {
                            for (var i = 0; i < Math.ceil(totalPaychecksReccured); i++) {
                                payDate.push(new Date(new Date(args.payDate).setDate(new Date(args.payDate).getDate() + (14 * (i + 1)) - 14)));
                                if (payDate.length >= totalPaychecksReccured) {
                                    console.log("date length", payDate.length);
                                    resolve({ date: payDate, dayDifferance: dayDifferance });
                                }
                            }
                        }
                        else {
                            payDate.push(new Date(new Date(args.payDate).setDate(new Date(args.payDate).getDate() + (14 * 1) - 14)));
                            console.log("date length", payDate.length);
                            resolve({ date: payDate, dayDifferance: dayDifferance });
                        }
                    }
                    if (args.repeatingType == 'monthly') {
                        dayDifferance = 30;
                        totalPaychecksReccured = parseInt((numDays / 30).toString());
                        if (numDays % 30 != 0) {
                            totalPaychecksReccured = totalPaychecksReccured + 1;
                        }
                        if (totalPaychecksReccured > 0) {
                            for (var i = 0; i <= totalPaychecksReccured; i++) {
                                if (args.weeks && args.weeks != null) {
                                    let firstWeekOfDate = getDateofWeek(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate()), args.weeks.weekDays);
                                    let weekNumber = args.weeks.weekNumber[0];
                                    payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * weekNumber) - 7)));
                                    if (payDate.length === totalPaychecksReccured) {
                                        console.log("date length", payDate.length);
                                        resolve({ date: payDate, dayDifferance: dayDifferance });
                                    }
                                } else {
                                    let firstWeekOfDate = getDateofWeek(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate()), 0);
                                    payDate.push(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate()));
                                    if (payDate.length >= totalPaychecksReccured) {
                                        console.log("date length", payDate.length);
                                        resolve({ date: payDate, dayDifferance: dayDifferance });
                                    }
                                }
                            }
                        }
                        else {
                            let firstWeekOfDate = getDateofWeek(new Date(args.payDate), 0);
                            payDate.push(new Date(args.payDate));
                            console.log("date length", payDate.length);
                            resolve({ date: payDate, dayDifferance: dayDifferance });
                        }
                    }
                    if (args.repeatingType == 'semimonthly') {
                        dayDifferance = 15;
                        totalPaychecksReccured = parseInt((numDays / 15).toString());
                        totalPaychecksReccured = totalPaychecksReccured + 1;
                        if (totalPaychecksReccured > 0) {
                            for (var i = 0; i < Math.ceil(totalPaychecksReccured); i++) {
                                if (args.weeks.dateFormat === 'weekly') {
                                    args.weeks.weekNumber.forEach(function (weeknum) {
                                        let firstWeekOfDate = getDateofWeek(new Date(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate())), args.weeks.weekDays);
                                        payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * weeknum) - 7)));
                                    })
                                    if (payDate.length >= totalPaychecksReccured) {
                                        console.log("date length", payDate.length);
                                        resolve({ date: payDate, dayDifferance: dayDifferance });
                                    }
                                }
                                else {
                                    args.weeks.monthDays.forEach(function (dayNum) {
                                        var currentDate = new Date(new Date(new Date(new Date().setFullYear(lastDate.getFullYear())).setMonth(lastDate.getMonth() + i)).setDate(lastDate.getDate()));
                                        payDate.push(new Date(currentDate.setDate(dayNum)));
                                    })
                                    if (payDate.length >= totalPaychecksReccured) {
                                        console.log("date length", payDate.length);
                                        resolve({ date: payDate, dayDifferance: dayDifferance });
                                    }
                                }
                            }
                        }
                        else {
                            if (args.weeks.dateFormat === 'weekly') {
                                args.weeks.weekNumber.forEach(function (weeknum) {
                                    let firstWeekOfDate = getDateofWeek(new Date(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate())), args.weeks.weekDays);
                                    payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * weeknum) - 7)));
                                })
                                console.log("date length", payDate.length);
                                resolve({ date: payDate, dayDifferance: dayDifferance });
                            }
                            else {
                                args.weeks.monthDays.forEach(function (dayNum) {
                                    var currentDate = new Date(lastDate.setMonth(lastDate.getMonth() + i));
                                    payDate.push(new Date(currentDate.setDate(dayNum)));
                                })
                                console.log("date length", payDate.length);
                                resolve({ date: payDate, dayDifferance: dayDifferance });
                            }
                        }
                    }
                }
                else {
                    payDate.push(new Date(args.payDate));
                    if (payDate.length) {
                        console.log("date length", payDate.length);
                        resolve({ date: payDate, dayDifferance: dayDifferance });
                    }
                }


            })

        }
        function getDateofWeek(startDate, days) {
            let date = moment().set('year', startDate.getFullYear()).set('month', startDate.getMonth()).set('date', 1);
            let firstDay = moment().set('year', startDate.getFullYear()).set('month', startDate.getMonth()).set('date', 1).weekday();
            if (firstDay == days) {
                return new Date(date)
            } else {
                let b = (days - firstDay);
                if (b > 0) {
                    return new Date(date.add(b, 'days'));
                } else {
                    let c = 7 - Math.abs(b);
                    return new Date(date.add(c, 'days'));
                }
            }
        }
    })
});

exports.assignPlaidTransaction = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        const data = req.body;
        const plaidRef = admin.firestore().collection("user_plaid_transaction").doc(data.userId).collection("transactions").doc(data.transactionId);
        const goalRef = admin.firestore().collection("users").doc(data.userId).collection("goals");
        plaidRef.get().then((plaidSnap) => {
            if (plaidSnap.exists) {
                const transData = plaidSnap.data();
                var sum = data.assignment.map(o => o.amount).reduce(function (a, b) {
                    return a + b;
                }, 0);
                let remainAmount = (transData.remainingAmount || transData.remainingAmount == 0) ? transData.remainingAmount : transData.amount;
                if (Math.abs(remainAmount) < sum) {
                    return res.status(400).send({
                        success: false,
                        logLevel: 2,
                        error: "You don't have enough amount,settle down your assignment amount"
                    });
                }
                if (data.type === "income" && transData.bank_Type === "credit") {
                    return res.status(400).send({
                        success: false,
                        logLevel: 2,
                        error: "You don't assign the credit card income transation It affect on budget feature."
                    });
                }
                plaidRef.update({
                    remainingAmount: Math.abs(remainAmount) - Math.abs(sum),
                    status: ((Math.abs(remainAmount) - sum) == 0) ? "Completed" : "Partially",
                    assignment: admin.firestore.FieldValue.arrayUnion(...data.assignment.map(o => o.paycheckId))
                });
                let error = [];
                const transRef = admin.firestore().collection("user_transaction").doc(data.userId).collection("transactions");
                const incomeRef = admin.firestore().collection("income_source").doc(data.userId).collection("incomes");
                data.category = data.category ? data.category : ["miscellaneous"];
                const category_id = data.category_id;
                transRef.add({
                    "name": transData.name,
                    "category": data.category,
                    "category_id": data.category_id,
                    "transactionDateTime": transData.date ? new Date(transData.date) : new Date(),
                    "transactionDateTimeStamp": transData.date ? new Date(transData.date).getTime() : new Date().getTime(),
                    "amount": transData.amount,
                    "assignment": data.assignment,
                    "plaidTransId": data.transactionId,
                    "type": data.type
                }).then(function (transResult) {
                    let count = 0;
                    let transId = transResult.id;
                    if (data.assignment.length == 0) {
                        return res.status(200).send({
                            success: false,
                            message: "no assignment found in transaction"
                        });
                    }
                    else {
                        //-----------------Income---------------------

                        // amount (-) means income (+) means expense
                        if (data.type === "income") {
                            updateIncomePaycheks(data.assignment[count], transId);
                            function updateIncomePaycheks(i, transId) {
                                incomeRef.where("paycheckIds", "array-contains", i.paycheckId).get().then((incomeSnap) => {
                                    if (incomeSnap.docs.length === 0) {
                                        error.push(`paycheck id not exists: ${i.paycheckId}`);
                                        count++;
                                        if (count == data.assignment.length) {
                                            return res.status(200).send({
                                                success: true,
                                                message: error
                                            });
                                        } else {
                                            updateIncomePaycheks(data.assignment[count], transId);
                                        }
                                    }
                                    else {
                                        const incomeSourceId = incomeSnap.docs[0].id;
                                        const incomeSourceData = incomeSnap.docs[0].data();
                                        let paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(i.paycheckId);
                                        paycheckGet.get().then((snapPayCheckReq) => {
                                            var paycheckData = snapPayCheckReq.data();
                                            var totalReceived = paycheckData.totalReceived === 0 ? Math.abs(i.amount) : paycheckData.totalReceived + Math.abs(i.amount)
                                            var totalspentAmount = paycheckData.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                return a + b;
                                            }, 0);
                                            var totalBudgetAmount = paycheckData.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                return a + b;
                                            }, 0);
                                            var totalsurplusAmount = paycheckData.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                return a + b;
                                            }, 0);
                                            paycheckGet.update({
                                                totalReceived: admin.firestore.FieldValue.increment(Math.abs(i.amount)),
                                                receivedPaycheckTransaction: admin.firestore.FieldValue.arrayUnion(transId),
                                                budgetsAvailable: totalReceived - totalspentAmount + totalsurplusAmount,
                                                budgetsCurrent: totalBudgetAmount,
                                                budgetsToBeBudgeted: totalReceived - totalBudgetAmount + totalsurplusAmount,
                                                isOverbudget: (totalReceived - totalBudgetAmount + totalsurplusAmount) < 0 ? true : false,
                                                isOverspent: (totalReceived - totalspentAmount + totalsurplusAmount) < 0 ? true : false
                                            }).then(() => {
                                                let Mostrecent = [];
                                                incomeRef.doc(incomeSourceId).collection("paychecks").get().then((query) => {
                                                    query.docs.filter(o => {
                                                        if (o.data().payDateTimeStamp > paycheckData.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                            Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                                            Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                            return;
                                                        }
                                                    });
                                                    if (Mostrecent.length) {
                                                        var surplusBudgetTemplate = [];
                                                        surplusBudgetTemplate = Mostrecent[0].surplusBudgetTemplate;
                                                        var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                                        var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                            return a + b;
                                                        }, 0);
                                                        var recentbudgetedAmount = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                            return a + b;
                                                        }, 0);
                                                        var recentsurplusAmount = surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                            return a + b;
                                                        }, 0);
                                                        incomeRef.doc(incomeSourceId).collection("paychecks").doc(Mostrecent[0].id).update({
                                                            "surplusBudgetTemplate": surplusBudgetTemplate,
                                                            "budgetsAvailable": recentReceived - recentspentAmount + recentsurplusAmount,
                                                            "budgetsCurrent": recentbudgetedAmount,
                                                            "budgetsToBeBudgeted": recentReceived - recentbudgetedAmount + recentsurplusAmount,
                                                            "isOverbudget": (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                            "isOverspent": (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                        }).then(() => {
                                                            if (count === data.assignment.length) {
                                                                return res.status(200).send({
                                                                    success: true,
                                                                    message: "all done!!"
                                                                });

                                                            } else {
                                                                updateIncomePaycheks(data.assignment[count], transId);
                                                            }
                                                        });
                                                    }
                                                    else {
                                                        if (count === data.assignment.length) {
                                                            return res.status(200).send({
                                                                success: true,
                                                                message: "all done!!"
                                                            });

                                                        } else {
                                                            updateIncomePaycheks(data.assignment[count], transId);
                                                        }
                                                    }
                                                });
                                            })
                                        })

                                    }
                                })
                            }
                        }
                        else {
                            //-----------------Expense---------------------
                            updatePaycheks(data.assignment[count], transId);
                            function updatePaycheks(i, transId) {
                                incomeRef.where("paycheckIds", "array-contains", i.paycheckId).get().then((snap) => {
                                    if (snap.docs.length === 0) {
                                        error.push(`paycheck id not exists: ${i.paycheckId}`);
                                        count++;
                                        if (count == data.assignment.length) {

                                            return res.status(200).send({
                                                success: true,
                                                message: "paycheck id not exists"
                                            });
                                        } else {
                                            updatePaycheks(data.assignment[count], transId);
                                        }
                                    } else {
                                        const incomeSourceId = snap.docs[0].id;
                                        const incomeSourceData = snap.docs[0].data();
                                        let Mostrecent = [];
                                        const paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(i.paycheckId);
                                        paycheckGet.get().then((snapPayCheckReq) => {
                                            var paycheckData = snapPayCheckReq.data();
                                            var existingBudgetDetails = paycheckData.budgetDetails;
                                            let index = existingBudgetDetails.findIndex(o => o.category == data.category);
                                            if (index != -1) {
                                                existingBudgetDetails[index].spent = existingBudgetDetails[index].spent + Math.abs(i.amount);
                                                existingBudgetDetails[index].available = existingBudgetDetails[index].available - Math.abs(i.amount);
                                                if (existingBudgetDetails[index].transactions && existingBudgetDetails[index].transactions.length) {
                                                    existingBudgetDetails[index].transactions.push(transId);
                                                }
                                                else {
                                                    existingBudgetDetails[index].transactions = [transId]
                                                }

                                            }
                                            else {
                                                existingBudgetDetails.push({
                                                    "category": data.category,
                                                    "category_id": data.category_id,
                                                    "budgeted": 0,
                                                    "spent": i.amount,
                                                    "available": -i.amount,
                                                    "transactions": [transId]
                                                })
                                            }
                                            var totalReceived = paycheckData.totalReceived === 0 ? paycheckData.totalExpected : paycheckData.totalReceived;
                                            var totalspentAmount = existingBudgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                return a + b;
                                            }, 0);
                                            var totalbudgetedAmount = existingBudgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                return a + b;
                                            }, 0);
                                            var totalsurplusAmount = paycheckData.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                return a + b;
                                            }, 0);
                                            paycheckGet.update({
                                                budgetDetails: existingBudgetDetails,
                                                budgetsCurrent: totalbudgetedAmount,
                                                budgetsAvailable: totalReceived - totalspentAmount + totalsurplusAmount,
                                                budgetsToBeBudgeted: totalReceived - totalbudgetedAmount + totalsurplusAmount,
                                                isOverbudget: (totalReceived - totalbudgetedAmount + totalsurplusAmount) < 0 ? true : false,
                                                isOverspent: (totalReceived - totalspentAmount + totalsurplusAmount) < 0 ? true : false
                                            }).then(() => {
                                                incomeRef.doc(incomeSourceId).collection("paychecks").get().then((query) => {
                                                    query.docs.filter(o => {
                                                        if (o.data().payDateTimeStamp > paycheckData.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                            Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                                            Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                            return;
                                                        }
                                                    });
                                                    if (Mostrecent.length) {
                                                        let indx = Mostrecent[0].budgetDetails.findIndex(o => (o.category) == (data.category));
                                                        if (indx != -1) {
                                                            Mostrecent[0].budgetDetails[indx].available = (Mostrecent[0].budgetDetails[indx].available + (-i.amount));
                                                            Mostrecent[0].budgetDetails[indx].budgeted = Mostrecent[0].budgetDetails[indx].budgeted + (-i.amount);
                                                        }
                                                        else {
                                                            Mostrecent[0].budgetDetails.push({
                                                                "category": data.category,
                                                                "category_id": data.category_id,
                                                                "budgeted": -i.amount,
                                                                "spent": 0,
                                                                "available": -i.amount,
                                                                "transactions": []
                                                            })
                                                        }
                                                        var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                                        var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                            return a + b;
                                                        }, 0);
                                                        var recentbudgetedAmount = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                            return a + b;
                                                        }, 0);
                                                        var recentsurplusAmount = Mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                            return a + b;
                                                        }, 0);
                                                        incomeRef.doc(incomeSourceId).collection("paychecks").doc(Mostrecent[0].id).update({
                                                            budgetDetails: Mostrecent[0].budgetDetails,
                                                            budgetsToBeBudgeted: recentReceived - recentbudgetedAmount + recentsurplusAmount,
                                                            budgetsCurrent: recentbudgetedAmount,
                                                            surplusBudgetTemplate: Mostrecent[0].surplusBudgetTemplate,
                                                            isOverbudget: (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                            budgetsAvailable: recentReceived - recentspentAmount + recentsurplusAmount,
                                                            isOverspent: recentReceived - recentspentAmount + recentsurplusAmount < 0 ? true : false
                                                        }).then(() => {
                                                            updateGoals(i.amount);
                                                        })
                                                    }
                                                    else {
                                                        updateGoals(i.amount);
                                                    }
                                                });
                                                function updateGoals(amount) {
                                                    count++;
                                                    goalRef.where("goal_incomeSource_Id", "==", incomeSourceId).get().then((snap) => {
                                                        if (snap.docs.length) {
                                                            var increase = 0;
                                                            snap.docs.forEach(goal => {
                                                                increase++;
                                                                if (goal.data().category_id === category_id) {
                                                                    var goalData = goal.data();
                                                                    if (goalData.goal_type === "saving") {
                                                                        goalData.left_amount = goalData.left_amount - Math.abs(amount);
                                                                        goalData.paid_amount = goalData.paid_amount + Math.abs(amount);
                                                                        goalData.isAccomplished = (goalData.paid_amount >= goalData.goal_amount) ? true : false;

                                                                        calculateDate(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                                            goalData.goal_endDate = date;
                                                                            goalRef.doc(goal.id).update({
                                                                                left_amount: goalData.paid_amount <= goalData.goal_amount ? goalData.left_amount : 0,
                                                                                paid_amount: goalData.paid_amount,
                                                                                goal_endDate: goalData.goal_endDate,
                                                                                isAccomplished: goalData.isAccomplished
                                                                            });
                                                                        });
                                                                    }
                                                                    else {
                                                                        goalData.left_amount = goalData.left_amount - Math.abs(amount);
                                                                        goalData.paid_amount = goalData.paid_amount + Math.abs(amount);
                                                                        goalData.isAccomplished = (goalData.left_amount === 0) ? true : false;
                                                                        calculateTarget(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                                            goalData.goal_endDate = date;
                                                                            goalRef.doc(goal.id).update({
                                                                                left_amount: goalData.paid_amount <= goalData.goal_amount ? goalData.left_amount : 0,
                                                                                paid_amount: goalData.paid_amount,
                                                                                goal_endDate: goalData.goal_endDate,
                                                                                isAccomplished: goalData.isAccomplished
                                                                            });
                                                                        });
                                                                    }

                                                                }
                                                                if (increase === snap.docs.length) {
                                                                    if (count === data.assignment.length) {
                                                                        return res.status(200).send({
                                                                            success: true,
                                                                            message: "paycheck budget updates"
                                                                        });

                                                                    } else {
                                                                        updatePaycheks(data.assignment[count], transId);

                                                                    }
                                                                }
                                                            });
                                                        }
                                                        else {
                                                            if (count === data.assignment.length) {
                                                                return res.status(200).send({
                                                                    success: true,
                                                                    message: "paycheck budget updates"
                                                                });

                                                            } else {
                                                                updatePaycheks(data.assignment[count], transId);

                                                            }
                                                        }

                                                    })
                                                }


                                            })

                                        })
                                    }
                                })
                            }

                        }

                    }

                }).catch(function (error) {
                    return res.status(400).send({
                        success: false,
                        logLevel: 1,
                        error: JSON.stringify(error)
                    });
                });


            }
            else {
                return res.status(400).send({
                    success: false,
                    logLevel: 1,
                    error: "Transaction Id not valid"
                });

            }

        }).catch(
            (err) => {
                return res.status(400).send({
                    success: false,
                    logLevel: 1,
                    error: "Transaction Id not valid"
                });
            }
        )


    });
});

exports.budgetAllocation = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        const data = request.body;
        const incomeRef = admin.firestore().collection("income_source").doc(data.userId).collection("incomes");
        if (data.incomeSourceId != null) {
            var fetchIncomes = incomeRef.doc(data.incomeSourceId);
            fetchIncomes.get().then((snap) => {
                const dbData = snap.data();
                var existingBudgetDetails = [];
                if (data.overrideTemplate) {
                    existingBudgetDetails = data.budgetTemplate;
                } else {
                    existingBudgetDetails = dbData.budgetTemplate.budgetTemplateDetails;
                    data.budgetTemplate.forEach((i) => {
                        let index = existingBudgetDetails.findIndex(o => (o.category) == (i.category));
                        if (index != -1) {
                            existingBudgetDetails[index].budgeted = existingBudgetDetails[index].budgeted + i.budgeted;
                        } else {
                            existingBudgetDetails.push({
                                "category_id": i.category_id,
                                "category": i.category,
                                "budgeted": i.budgeted
                            })
                        }
                    })
                }
                fetchIncomes.update({
                    ['budgetTemplate.budgetTemplateDetails']: existingBudgetDetails
                }).then(() => {
                    if (data.applyForAllPaycheks) {
                        let paycheckPromises = [];
                        const payChecksRef = fetchIncomes.collection("paychecks");
                        payChecksRef.get().then((snapRef) => {
                            snapRef.docs.map(o => {
                                if (o.data().payDateTimeStamp >= data.paycheckPayTimeStamp) {
                                    paycheckPromises.push({
                                        paycheck: Object.assign({ id: o.id }, o.data())
                                    })
                                }
                            })
                            if (paycheckPromises.length) {
                                let count = 0;
                                assignTopaycheck(paycheckPromises[count].paycheck);
                                function allocateToMostrecent() {
                                    var holePaycheck = [];
                                    payChecksRef.get().then(async (snapRef) => {
                                        snapRef.docs.map(o => { if (o.data().payDateTimeStamp <= new Date().getTime()) { holePaycheck.push(Object.assign({ id: o.id }, o.data())) } })
                                        if (holePaycheck.length) {
                                            var _holeIndex = 0;
                                            await budgetallocationLoop(holePaycheck[_holeIndex]);
                                            function budgetallocationLoop(paycheck) {
                                                _holeIndex++;
                                                var existingpaycheckBudgetDetails = paycheck.budgetDetails;
                                                var Mostrecent = [];
                                                payChecksRef.get().then((snapallReq) => {
                                                    snapallReq.docs.filter(o => {
                                                        if (o.data().payDateTimeStamp > paycheck.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                            Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                                            Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                            return;
                                                        }
                                                    });
                                                    if (Mostrecent.length && paycheck.id != Mostrecent[0].id) {
                                                        let template_Index = 0;
                                                        data.budgetTemplate.forEach(i => {
                                                            template_Index++;
                                                            if (template_Index <= data.budgetTemplate.length) {
                                                                let eIndex = existingpaycheckBudgetDetails.findIndex(o => o.category === i.category);
                                                                if (eIndex != -1) {
                                                                    let _index = Mostrecent[0].budgetDetails.findIndex(o => o.category === i.category);
                                                                    if (_index != -1) {
                                                                        Mostrecent[0].budgetDetails[_index].budgeted = Mostrecent[0].budgetDetails[_index].budgeted + existingpaycheckBudgetDetails[eIndex].available;
                                                                        Mostrecent[0].budgetDetails[_index].available = Mostrecent[0].budgetDetails[_index].available + existingpaycheckBudgetDetails[eIndex].available;
                                                                    }
                                                                    else {
                                                                        Mostrecent[0].budgetDetails.push({
                                                                            "category": i.category,
                                                                            "category_id": i.category_id,
                                                                            "budgeted": existingpaycheckBudgetDetails[eIndex].available,
                                                                            "spent": 0,
                                                                            "available": existingpaycheckBudgetDetails[eIndex].available,
                                                                            "transactions": []
                                                                        });
                                                                    }
                                                                    let _rindex = Mostrecent[0].rolloverBudgetTemplate.findIndex(o => o.category === i.category);
                                                                    if (_rindex != -1) {
                                                                        Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted = Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted + existingpaycheckBudgetDetails[eIndex].available;
                                                                        Mostrecent[0].rolloverBudgetTemplate[_rindex].available = Mostrecent[0].rolloverBudgetTemplate[_rindex].available + existingpaycheckBudgetDetails[eIndex].available;
                                                                    }
                                                                    else {
                                                                        Mostrecent[0].rolloverBudgetTemplate.push({
                                                                            "category": i.category,
                                                                            "category_id": i.category_id,
                                                                            "budgeted": existingpaycheckBudgetDetails[eIndex].available,
                                                                            "spent": 0,
                                                                            "available": existingpaycheckBudgetDetails[eIndex].available,
                                                                            "transactions": []
                                                                        });
                                                                    }
                                                                }
                                                                if (data.budgetTemplate.length === template_Index) {
                                                                    var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                                                    var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                        return a + b;
                                                                    }, 0);
                                                                    var recentbudgetedAmount = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                        return a + b;
                                                                    }, 0);
                                                                    var recentsurplusAmount = Mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                        return a + b;
                                                                    }, 0);
                                                                    payChecksRef.doc(Mostrecent[0].id).update({
                                                                        budgetDetails: Mostrecent[0].budgetDetails,
                                                                        budgetsToBeBudgeted: (recentReceived - recentbudgetedAmount) + recentsurplusAmount,
                                                                        budgetsCurrent: recentbudgetedAmount,
                                                                        rolloverBudgetTemplate: Mostrecent[0].rolloverBudgetTemplate,
                                                                        surplusBudgetTemplate: Mostrecent[0].surplusBudgetTemplate,
                                                                        budgetsAvailable: (recentReceived - recentspentAmount) + recentsurplusAmount,
                                                                        isOverbudget: (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                                        isOverspent: (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                                    }).then(() => {
                                                                        if (_holeIndex === holePaycheck.length) {
                                                                            return response.status(200).send({
                                                                                success: true,
                                                                                message: "Template Update"
                                                                            });
                                                                        }
                                                                        if (_holeIndex < holePaycheck.length) {
                                                                            budgetallocationLoop(holePaycheck[_holeIndex]);
                                                                        }
                                                                    }).catch(err => {
                                                                        if (_holeIndex === holePaycheck.length) {
                                                                            return response.status(200).send({
                                                                                success: true,
                                                                                message: "Template Update"
                                                                            });
                                                                        }
                                                                        if (_holeIndex < holePaycheck.length) {
                                                                            budgetallocationLoop(holePaycheck[_holeIndex]);
                                                                        }
                                                                    })
                                                                }
                                                            }

                                                        })

                                                    }
                                                    else {
                                                        if (_holeIndex === holePaycheck.length) {
                                                            return response.status(200).send({
                                                                success: true,
                                                                message: "Template Update"
                                                            });
                                                        }
                                                        if (_holeIndex < holePaycheck.length) {
                                                            budgetallocationLoop(holePaycheck[_holeIndex]);
                                                        }
                                                    }
                                                }).catch(err => {
                                                    if (_holeIndex === holePaycheck.length) {
                                                        return response.status(200).send({
                                                            success: true,
                                                            message: "Template Update"
                                                        });
                                                    }
                                                    if (_holeIndex < holePaycheck.length) {
                                                        budgetallocationLoop(holePaycheck[_holeIndex]);
                                                    }
                                                })
                                            }
                                        }
                                        else {
                                            return response.status(200).send({
                                                success: true,
                                                message: "Template Update"
                                            });
                                        }
                                    })
                                }
                                function assignTopaycheck(paycheck) {
                                    count++;
                                    var existingpaycheckBudgetDetails = paycheck.budgetDetails;
                                    var totalBudgeted = 0;
                                    let budgetTmplt_index = 0;
                                    var totalReceived, totalspentAmount, totalbudgetedAmount, totalsurplusAmount = 0;
                                    data.budgetTemplate.forEach(i => {
                                        budgetTmplt_index++;
                                        if (budgetTmplt_index <= data.budgetTemplate.length) {
                                            totalBudgeted = totalBudgeted + i.budgeted;
                                            let index = existingpaycheckBudgetDetails.findIndex(o => o.category === i.category);
                                            if (index != -1) {
                                                existingpaycheckBudgetDetails[index].budgeted = existingpaycheckBudgetDetails[index].budgeted + i.budgeted;
                                                existingpaycheckBudgetDetails[index].available = existingpaycheckBudgetDetails[index].available + i.budgeted;
                                            }
                                            else {
                                                existingpaycheckBudgetDetails.push({
                                                    "category": i.category,
                                                    "category_id": i.category_id,
                                                    "budgeted": i.budgeted,
                                                    "spent": 0,
                                                    "available": i.budgeted,
                                                    "transactions": []
                                                });
                                            }
                                            if (budgetTmplt_index === data.budgetTemplate.length) {
                                                totalReceived = paycheck.totalReceived === 0 ? paycheck.totalExpected : paycheck.totalReceived;
                                                totalspentAmount = paycheck.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                totalbudgetedAmount = paycheck.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                totalsurplusAmount = paycheck.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                payChecksRef.doc(paycheck.id).update({
                                                    budgetDetails: existingpaycheckBudgetDetails,
                                                    budgetsToBeBudgeted: totalReceived - totalbudgetedAmount + totalsurplusAmount,
                                                    budgetsCurrent: totalbudgetedAmount,
                                                    isOverbudget: (totalReceived - totalbudgetedAmount + totalsurplusAmount) < 0 ? true : false,
                                                }).then(() => {
                                                    if (paycheckPromises.length === count) {
                                                        allocateToMostrecent();
                                                    }
                                                    if (paycheckPromises.length > count) {
                                                        assignTopaycheck(paycheckPromises[count].paycheck);
                                                    }
                                                }).catch(() => {
                                                    if (paycheckPromises.length === count) {
                                                        allocateToMostrecent();
                                                    }
                                                    if (paycheckPromises.length > count) {
                                                        assignTopaycheck(paycheckPromises[count].paycheck);
                                                    }
                                                })
                                            }
                                        }

                                    });


                                }
                            }
                        });
                    }
                    else {
                        const incomeSourceId = data.incomeSourceId;
                        const paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks");
                        paycheckGet.doc(data.paycheckId).get().then((snapPayCheckReq) => {
                            var snappayCheck = snapPayCheckReq.data();
                            var existingpaycheckBudgetDetails = snappayCheck.budgetDetails;

                            var totalbudgetedAmount, totalReceived, totalsurplusAmount, totalspentAmount = 0;
                            let totalBudgeted = 0;

                            data.budgetTemplate.forEach(function (i) {
                                totalBudgeted = totalBudgeted + i.budgeted;
                                let index = existingpaycheckBudgetDetails.findIndex(o => (o.category) == (i.category));
                                if (index != -1) {
                                    existingpaycheckBudgetDetails[index].budgeted = existingpaycheckBudgetDetails[index].budgeted + i.budgeted;
                                    existingpaycheckBudgetDetails[index].available = existingpaycheckBudgetDetails[index].available + i.budgeted
                                }
                                else {
                                    existingpaycheckBudgetDetails.push({
                                        "category": i.category,
                                        "budgeted": i.budgeted,
                                        "category_id": i.category_id,
                                        "spent": 0,
                                        "available": i.budgeted,
                                        "transactions": []
                                    })
                                }
                                totalReceived = snappayCheck.totalReceived === 0 ? snappayCheck.totalExpected : snappayCheck.totalReceived;
                                totalspentAmount = existingpaycheckBudgetDetails.map(o => o.spent).reduce(function (a, b) {
                                    return a + b;
                                }, 0);
                                totalbudgetedAmount = existingpaycheckBudgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                    return a + b;
                                }, 0);
                                totalsurplusAmount = snappayCheck.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                    return a + b;
                                }, 0);


                            })
                            paycheckGet.doc(data.paycheckId).update({
                                budgetDetails: existingpaycheckBudgetDetails,
                                budgetsToBeBudgeted: totalReceived - totalbudgetedAmount + totalsurplusAmount,
                                budgetsCurrent: totalbudgetedAmount,
                                isOverbudget: (totalReceived - totalbudgetedAmount + totalsurplusAmount) < 0 ? true : false
                            }).then(() => {
                                var Mostrecent = [];
                                paycheckGet.get().then((snapallReq) => {
                                    snapallReq.docs.filter(o => {
                                        if (o.data().payDateTimeStamp > snappayCheck.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                            Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                            Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                            return;
                                        }
                                    });
                                    if (Mostrecent.length) {
                                        data.budgetTemplate.forEach(function (i) {
                                            let eIndex = existingpaycheckBudgetDetails.findIndex(o => o.category === i.category);
                                            if (eIndex != -1) {
                                                let _index = Mostrecent[0].budgetDetails.findIndex(o => o.category === i.category);
                                                if (_index != -1) {
                                                    Mostrecent[0].budgetDetails[_index].budgeted = Mostrecent[0].budgetDetails[_index].budgeted + existingpaycheckBudgetDetails[eIndex].available;
                                                    Mostrecent[0].budgetDetails[_index].available = Mostrecent[0].budgetDetails[_index].available + existingpaycheckBudgetDetails[eIndex].available;
                                                }
                                                else {
                                                    Mostrecent[0].budgetDetails.push({
                                                        "category": i.category,
                                                        "category_id": i.category_id,
                                                        "budgeted": existingpaycheckBudgetDetails[eIndex].available,
                                                        "spent": 0,
                                                        "available": existingpaycheckBudgetDetails[eIndex].available,
                                                        "transactions": []
                                                    });
                                                }

                                                let _rindex = Mostrecent[0].rolloverBudgetTemplate.findIndex(o => o.category === i.category);
                                                if (_rindex != -1) {
                                                    Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted = Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted + existingpaycheckBudgetDetails[eIndex].available;
                                                    Mostrecent[0].rolloverBudgetTemplate[_rindex].available = Mostrecent[0].rolloverBudgetTemplate[_rindex].available + existingpaycheckBudgetDetails[eIndex].available;
                                                }
                                                else {
                                                    Mostrecent[0].rolloverBudgetTemplate.push({
                                                        "category": i.category,
                                                        "category_id": i.category_id,
                                                        "budgeted": existingpaycheckBudgetDetails[eIndex].available,
                                                        "spent": 0,
                                                        "available": existingpaycheckBudgetDetails[eIndex].available,
                                                        "transactions": []
                                                    });
                                                }
                                            }
                                        })
                                        var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                        var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                            return a + b;
                                        }, 0);
                                        var recentbudgetedAmount = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                            return a + b;
                                        }, 0);
                                        var recentsurplusAmount = Mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                            return a + b;
                                        }, 0);
                                        paycheckGet.doc(Mostrecent[0].id).update({
                                            budgetDetails: Mostrecent[0].budgetDetails,
                                            budgetsToBeBudgeted: recentReceived - recentbudgetedAmount + recentsurplusAmount,
                                            budgetsCurrent: recentbudgetedAmount,
                                            rolloverBudgetTemplate: Mostrecent[0].rolloverBudgetTemplate,
                                            isOverbudget: (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                            surplusBudgetTemplate: Mostrecent[0].surplusBudgetTemplate,
                                            budgetsAvailable: recentReceived - recentspentAmount + recentsurplusAmount,
                                            isOverspent: (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                        }).then(() => {

                                            incomeRef.doc(incomeSourceId).update({
                                                ['budgetTemplate.budgetsToBeBudgeted']: admin.firestore.FieldValue.increment(-totalBudgeted)
                                            }).then(() => {
                                                return response.status(200).send({
                                                    success: true,
                                                    message: "Template Update"
                                                });
                                            });
                                        }).catch(() => {
                                            incomeRef.doc(incomeSourceId).update({
                                                ['budgetTemplate.budgetsToBeBudgeted']: admin.firestore.FieldValue.increment(-totalBudgeted)
                                            }).then(() => {
                                                return response.status(200).send({
                                                    success: true,
                                                    message: "Template Update"
                                                });
                                            });
                                        });
                                    }
                                    else {
                                        incomeRef.doc(incomeSourceId).update({
                                            ['budgetTemplate.budgetsToBeBudgeted']: admin.firestore.FieldValue.increment(-totalBudgeted)
                                        }).then(() => {
                                            return response.status(200).send({
                                                success: true,
                                                message: "Template Update"
                                            });
                                        });
                                    }
                                });

                            })
                        })

                    }
                })
            }).catch((err) => {
                return response.status(400).send({
                    success: false,
                    message: JSON.stringify(err)
                });
                // resolve({success:true});
            })
        }
        else if (data.incomeSourceId == null && data.paycheckId != null && !data.budgetTemplateUpdate) {
            const fetchIncomes = incomeRef.where("paycheckIds", "array-contains", data.paycheckId)
            fetchIncomes.get().then((snap) => {
                if (snap.docs.length === 0) {
                    return response.status(200).send({
                        success: true,
                        message: "No paychecks exists"
                    });
                }
                let incomeSourceId = snap.docs[0].id;
                const paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks");
                paycheckGet.doc(data.paycheckId).get().then((snapPayCheckReq) => {
                    var snappayCheck = snapPayCheckReq.data();
                    let existingpaycheckBudgetDetails = snappayCheck.budgetDetails;
                    var totalbudgetedAmount, totalReceived, totalsurplusAmount, totalspentAmount = 0;
                    let totalBudgeted = 0;
                    data.budgetTemplate.forEach(function (i) {
                        totalBudgeted = totalBudgeted + i.budgeted;
                        let index = existingpaycheckBudgetDetails.findIndex(o => (o.category) == (i.category));
                        if (index != -1) {
                            existingpaycheckBudgetDetails[index].budgeted = existingpaycheckBudgetDetails[index].budgeted + i.budgeted;
                            existingpaycheckBudgetDetails[index].available = existingpaycheckBudgetDetails[index].available + i.budgeted
                        }
                        else {
                            existingpaycheckBudgetDetails.push({
                                "category": i.category,
                                "category_id": i.category_id,
                                "budgeted": i.budgeted,
                                "spent": 0,
                                "available": i.budgeted,
                                "transactions": []
                            });
                        }
                        totalReceived = snappayCheck.totalReceived === 0 ? snappayCheck.totalExpected : snappayCheck.totalReceived;
                        totalspentAmount = existingpaycheckBudgetDetails.map(o => o.spent).reduce(function (a, b) {
                            return a + b;
                        }, 0);
                        totalbudgetedAmount = existingpaycheckBudgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                            return a + b;
                        }, 0);
                        totalsurplusAmount = snappayCheck.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                            return a + b;
                        }, 0);
                    })
                    paycheckGet.doc(data.paycheckId).update({
                        budgetDetails: existingpaycheckBudgetDetails,
                        budgetsToBeBudgeted: totalReceived - totalbudgetedAmount + totalsurplusAmount,
                        budgetsCurrent: totalbudgetedAmount,
                        isOverbudget: (totalReceived - totalbudgetedAmount + totalsurplusAmount) < 0 ? true : false
                    }).then(() => {
                        var Mostrecent = [];
                        paycheckGet.get().then((snapallReq) => {
                            snapallReq.docs.filter(o => {
                                if (o.data().payDateTimeStamp > snappayCheck.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                    Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                    Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                    return;
                                }
                            });
                            if (Mostrecent.length) {
                                data.budgetTemplate.forEach(function (i) {
                                    let eIndex = existingpaycheckBudgetDetails.findIndex(o => o.category === i.category);
                                    if (eIndex != -1) {
                                        let _index = Mostrecent[0].budgetDetails.findIndex(o => o.category === i.category);
                                        if (_index != -1) {
                                            Mostrecent[0].budgetDetails[_index].budgeted = Mostrecent[0].budgetDetails[_index].budgeted + existingpaycheckBudgetDetails[eIndex].available;
                                            Mostrecent[0].budgetDetails[_index].available = Mostrecent[0].budgetDetails[_index].available + existingpaycheckBudgetDetails[eIndex].available;
                                        }
                                        else {
                                            Mostrecent[0].budgetDetails.push({
                                                "category": i.category,
                                                "category_id": i.category_id,
                                                "budgeted": existingpaycheckBudgetDetails[eIndex].available,
                                                "spent": 0,
                                                "available": existingpaycheckBudgetDetails[eIndex].available,
                                                "transactions": []
                                            });
                                        }
                                        let _rindex = Mostrecent[0].rolloverBudgetTemplate.findIndex(o => o.category === i.category);
                                        if (_rindex != -1) {
                                            Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted = Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted + existingpaycheckBudgetDetails[eIndex].available;
                                            Mostrecent[0].rolloverBudgetTemplate[_rindex].available = Mostrecent[0].rolloverBudgetTemplate[_rindex].available + existingpaycheckBudgetDetails[eIndex].available;
                                        }
                                        else {
                                            Mostrecent[0].rolloverBudgetTemplate.push({
                                                "category": i.category,
                                                "category_id": i.category_id,
                                                "budgeted": existingpaycheckBudgetDetails[eIndex].available,
                                                "spent": 0,
                                                "available": existingpaycheckBudgetDetails[eIndex].available,
                                                "transactions": []
                                            });
                                        }
                                    }
                                })

                                var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                    return a + b;
                                }, 0);
                                var recentbudgetedAmount = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                    return a + b;
                                }, 0);
                                var recentsurplusAmount = Mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                    return a + b;
                                }, 0);
                                paycheckGet.doc(Mostrecent[0].id).update({
                                    budgetDetails: Mostrecent[0].budgetDetails,
                                    budgetsToBeBudgeted: recentReceived - recentbudgetedAmount + recentsurplusAmount,
                                    budgetsCurrent: recentbudgetedAmount,
                                    rolloverBudgetTemplate: Mostrecent[0].rolloverBudgetTemplate,
                                    budgetsAvailable: recentReceived - recentspentAmount + recentsurplusAmount,
                                    isOverbudget: (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                    surplusBudgetTemplate: Mostrecent[0].surplusBudgetTemplate,
                                    isOverspent: (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                }).then(() => {
                                    incomeRef.doc(incomeSourceId).update({
                                        ['budgetTemplate.budgetsToBeBudgeted']: admin.firestore.FieldValue.increment(-totalBudgeted)
                                    }).then(() => {
                                        return response.status(200).send({
                                            success: true,
                                            message: "Template Update"
                                        });
                                    });
                                }).catch((err) => {
                                    incomeRef.doc(incomeSourceId).update({
                                        ['budgetTemplate.budgetsToBeBudgeted']: admin.firestore.FieldValue.increment(-totalBudgeted)
                                    }).then(() => {
                                        return response.status(200).send({
                                            success: true,
                                            message: "Template Update but the mostrecent has an error"
                                        });
                                    });
                                });
                            }
                            else {
                                incomeRef.doc(incomeSourceId).update({
                                    ['budgetTemplate.budgetsToBeBudgeted']: admin.firestore.FieldValue.increment(-totalBudgeted)
                                }).then(() => {
                                    return response.status(200).send({
                                        success: true,
                                        message: "Template Update"
                                    });
                                });
                            }
                        })

                    })
                })
            })
        }
        else {
            return response.status(200).send({
                success: false,
                message: "Invalid Request"
            });
        }
    })
});

exports.cancelSubscription = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        const tokenId = req.get('Authorization').split('Bearer ')[1];
        admin.auth().verifyIdToken(tokenId)
            .then(async () => {
                const subscription = await stripe.subscriptions.del(req.body.subscriptionId);
                admin.firestore().collection('subscriptions').doc(req.body.userId).collection("subscription_detail").doc(req.body.subscriptionId).set(subscription)
                let userRef = admin.firestore().collection('users').doc(req.body.userId);
                userRef.get().then((userSnap) => {
                    let user = userSnap.data();
                    user['sub_status'] = subscription.status;
                    userRef.set(user);
                    res.status(200).send({
                        success: true,
                        subscription: subscription
                    });
                }).catch((e) => {
                    console.log("ee", JSON.stringify(e))
                });

            }).catch((e) => {
                console.log(JSON.stringify(e))
            });
    })
});

exports.changeBudgetedAmount = functions.https.onRequest((req, res) => {
    cors((req, res) => {
        console.log(req.body);
        const userId = req.body.uid;
        const params = req.body;
        const incomeRef = admin.firestore().collection("income_source").doc(userId).collection("incomes").doc(params.incomesourceId)
        incomeRef.get().then((incomeSnap) => {
            if (incomeSnap.exists) {
                var dbData = incomeSnap.data();
                var existingBudgetDetails = dbData.budgetTemplate.budgetTemplateDetails;
                let index = existingBudgetDetails.findIndex(o => o.category === params.budgetline.category);
                if (index != -1 && params.applyForAllPaycheks) {
                    existingBudgetDetails[index].budgeted = params.amount;
                }
                incomeRef.update({
                    ['budgetTemplate.budgetTemplateDetails']: existingBudgetDetails
                }).then(() => {
                    const paycheckGet = incomeRef.collection("paychecks");
                    if (params.applyForAllPaycheks) {
                        updateFuturePaycheck(params);
                        function updateFuturePaycheck(request) {
                            paycheckGet.get().then((paycheckDocs) => {
                                var paycheckDocsData = [];
                                if (paycheckDocs.docs.length) {
                                    var count = 0;
                                    paycheckDocs.docs.forEach((m, snapcountIndex) => {
                                        paycheckDocsData.push(Object.assign({ id: m.id }, m.data()))
                                    });
                                    if (paycheckDocsData.length) {
                                        paycheckDocsData = paycheckDocsData.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp);
                                        editBudetAllocation(paycheckDocsData[count]);
                                        function editBudetAllocation(o) {
                                            count++;
                                            if (o.payDateTimeStamp >= request.payDateTimeStamp) {
                                                let paycheckDetails = o;
                                                let existingBudget = paycheckDetails.budgetDetails;
                                                let pIndex = existingBudget.findIndex(m => m.category === request.budgetline.category);
                                                let _rindex = paycheckDetails.rolloverBudgetTemplate.findIndex(m => m.category === request.budgetline.category);
                                                if (_rindex != -1 && pIndex != -1) {
                                                    existingBudget[pIndex].budgeted = ((existingBudget[pIndex].budgeted - paycheckDetails.rolloverBudgetTemplate[_rindex].budgeted) - request.budgetline.budgeted) + request.amount;
                                                    existingBudget[pIndex].available = ((existingBudget[pIndex].available - paycheckDetails.rolloverBudgetTemplate[_rindex].budgeted) - request.budgetline.budgeted) + request.amount;
                                                    paycheckDetails.rolloverBudgetTemplate[_rindex].budgeted = (paycheckDetails.rolloverBudgetTemplate[_rindex].budgeted - paycheckDetails.rolloverBudgetTemplate[_rindex].budgeted);
                                                    paycheckDetails.rolloverBudgetTemplate[_rindex].available = (paycheckDetails.rolloverBudgetTemplate[_rindex].available - paycheckDetails.rolloverBudgetTemplate[_rindex].budgeted);
                                                }
                                                else if (pIndex != -1) {
                                                    existingBudget[pIndex].budgeted = (existingBudget[pIndex].budgeted - request.budgetline.budgeted) + request.amount;
                                                    existingBudget[pIndex].available = (existingBudget[pIndex].available - request.budgetline.budgeted) + request.amount;
                                                }
                                                var totalReceived = paycheckDetails.totalReceived === 0 ? paycheckDetails.totalExpected : paycheckDetails.totalReceived;
                                                var totalspentAmount = existingBudget.map(m => m.spent).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                var totalbudgetedAmount = existingBudget.map(m => m.budgeted).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                paycheckGet.doc(paycheckDetails.id).update({
                                                    budgetDetails: existingBudget,
                                                    budgetsToBeBudgeted: totalReceived - totalbudgetedAmount,
                                                    budgetsCurrent: totalbudgetedAmount,
                                                    rolloverBudgetTemplate: paycheckDetails.rolloverBudgetTemplate,
                                                    isOverbudget: (totalReceived - totalbudgetedAmount) < 0 ? true : false,
                                                }).then(() => {
                                                    paycheckGet.get().then((mpaycheckDocs) => {
                                                        var mostrecent = [];
                                                        if (mpaycheckDocs.docs.length) {
                                                            mpaycheckDocs.docs.filter(m => {
                                                                if (m.id != paycheckDetails.id && m.data().payDateTimeStamp >= paycheckDetails.payDateTimeStamp && m.data().payDateTimeStamp <= new Date().getTime()) {
                                                                    mostrecent.push(Object.assign({ id: m.id }, m.data()))
                                                                }
                                                            });
                                                            if (mostrecent.length) {
                                                                mostrecent = mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                                let mIndex = mostrecent[0].budgetDetails.findIndex(o => o.category === request.budgetline.category)
                                                                var mostrecentRollOver = mostrecent[0].rolloverBudgetTemplate;
                                                                let _mrindex = mostrecent[0].rolloverBudgetTemplate.findIndex(o => o.category === request.budgetline.category);
                                                                if (_mrindex != -1 && mIndex != -1) {
                                                                    mostrecent[0].budgetDetails[mIndex].budgeted = (mostrecent[0].budgetDetails[mIndex].budgeted - mostrecent[0].rolloverBudgetTemplate[_mrindex].budgeted) + request.amount;
                                                                    mostrecent[0].budgetDetails[mIndex].available = (mostrecent[0].budgetDetails[mIndex].available - mostrecent[0].rolloverBudgetTemplate[_mrindex].budgeted) + request.amount;
                                                                    // it is for latest in rollover
                                                                    mostrecentRollOver[_mrindex].budgeted = (mostrecent[0].rolloverBudgetTemplate[_mrindex].budgeted - mostrecent[0].rolloverBudgetTemplate[_mrindex].budgeted) + request.amount;
                                                                    mostrecentRollOver[_mrindex].available = (mostrecent[0].rolloverBudgetTemplate[_mrindex].available - - mostrecent[0].rolloverBudgetTemplate[_mrindex].budgeted) + request.amount;
                                                                    // it is for local use in rollover
                                                                    mostrecent[0].rolloverBudgetTemplate[_mrindex].budgeted = (mostrecent[0].rolloverBudgetTemplate[_mrindex].budgeted - mostrecent[0].rolloverBudgetTemplate[_mrindex].budgeted);
                                                                    mostrecent[0].rolloverBudgetTemplate[_mrindex].available = (mostrecent[0].rolloverBudgetTemplate[_mrindex].available - - mostrecent[0].rolloverBudgetTemplate[_mrindex].budgeted);
                                                                }
                                                                else if (mIndex != -1) {
                                                                    mostrecent[0].budgetDetails[mIndex].budgeted = (mostrecent[0].budgetDetails[mIndex].budgeted) + request.amount;
                                                                    mostrecent[0].budgetDetails[mIndex].available = (mostrecent[0].budgetDetails[mIndex].available) + request.amount;
                                                                }
                                                                var mtotalReceived = mostrecent[0].totalReceived === 0 ? mostrecent[0].totalExpected : mostrecent[0].totalReceived;
                                                                var mtotalspentAmount = mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                    return a + b;
                                                                }, 0);
                                                                var mtotalbudgetedAmount = mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                    return a + b;
                                                                }, 0);
                                                                var mtotalsurplusAmount = mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                    return a + b;
                                                                }, 0);
                                                                paycheckGet.doc(mostrecent[0].id).update({
                                                                    budgetDetails: mostrecent[0].budgetDetails,
                                                                    budgetsToBeBudgeted: mtotalReceived - mtotalbudgetedAmount + mtotalsurplusAmount,
                                                                    budgetsCurrent: mtotalbudgetedAmount,
                                                                    rolloverBudgetTemplate: mostrecentRollOver,
                                                                    budgetsAvailable: mtotalReceived - mtotalspentAmount + mtotalsurplusAmount,
                                                                    isOverbudget: (mtotalReceived - mtotalbudgetedAmount + mtotalsurplusAmount) < 0 ? true : false,
                                                                    isOverspent: (mtotalReceived - mtotalspentAmount + mtotalsurplusAmount) < 0 ? true : false
                                                                }).then(() => {
                                                                    if (count === paycheckDocs.docs.length) {
                                                                        return res.status(200).send({
                                                                            success: true,
                                                                            message: "update all paychecks"
                                                                        })
                                                                    }
                                                                    else {
                                                                        let find = paycheckDocsData.findIndex(o => o.id === mostrecent[0].id);
                                                                        if (find != -1) {
                                                                            paycheckDocsData[find].budgetDetails = mostrecent[0].budgetDetails;
                                                                            paycheckDocsData[find].budgetsToBeBudgeted = mtotalReceived - mtotalbudgetedAmount + mtotalsurplusAmount;
                                                                            paycheckDocsData[find].budgetsCurrent = mtotalbudgetedAmount;
                                                                            paycheckDocsData[find].rolloverBudgetTemplate = mostrecent[0].rolloverBudgetTemplate;
                                                                            paycheckDocsData[find].budgetsAvailable = mtotalReceived - mtotalspentAmount + mtotalsurplusAmount;
                                                                            paycheckDocsData[find].isOverbudget = (mtotalReceived - mtotalbudgetedAmount + mtotalsurplusAmount) < 0 ? true : false;
                                                                            paycheckDocsData[find].isOverspent = (mtotalReceived - mtotalspentAmount + mtotalsurplusAmount) < 0 ? true : false;
                                                                        }
                                                                        editBudetAllocation(paycheckDocsData[count])
                                                                    }
                                                                }).catch(() => {
                                                                    if (count === paycheckDocs.docs.length) {
                                                                        return res.status(200).send({
                                                                            success: true,
                                                                            message: "update all paychecks"
                                                                        })
                                                                    }
                                                                    else {
                                                                        editBudetAllocation(paycheckDocsData[count])
                                                                    }
                                                                })
                                                            }
                                                            else {
                                                                if (count === paycheckDocs.docs.length) {
                                                                    return res.status(200).send({
                                                                        success: true,
                                                                        message: "update all paychecks"
                                                                    })
                                                                }
                                                                else {
                                                                    editBudetAllocation(paycheckDocsData[count])
                                                                }
                                                            }
                                                        }
                                                    })
                                                }).catch((err) => {
                                                    return res.status(200).send({
                                                        success: false,
                                                        message: err
                                                    })
                                                })
                                            }
                                            else {
                                                if (count === paycheckDocs.docs.length) {
                                                    return res.status(200).send({
                                                        success: true,
                                                        message: "update all paychecks"
                                                    })
                                                }
                                                else {
                                                    editBudetAllocation(paycheckDocsData[count])
                                                }
                                            }
                                        }
                                    }
                                }
                                else {
                                    return res.status(200).send({ success: false, message: 'No paycheck found for this income source' })
                                }
                            })
                        }
                    }
                    else {
                        updateCurrentPaycheck(params)
                        function updateCurrentPaycheck(request) {
                            paycheckGet.doc(request.id).get().then((paycheckSnap) => {
                                if (paycheckSnap.exists) {
                                    let paycheckDetails = paycheckSnap.data();
                                    let existingBudget = paycheckDetails.budgetDetails;
                                    let pIndex = existingBudget.findIndex(o => o.category === request.budgetline.category);
                                    if (pIndex != -1) {
                                        existingBudget[pIndex].budgeted = (existingBudget[pIndex].budgeted - request.budgetline.budgeted) + request.amount;
                                        existingBudget[pIndex].available = (existingBudget[pIndex].available - request.budgetline.budgeted) + request.amount;
                                    }
                                    var totalReceived = paycheckDetails.totalReceived === 0 ? paycheckDetails.totalExpected : paycheckDetails.totalReceived;
                                    var totalspentAmount = existingBudget.map(o => o.spent).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    var totalbudgetedAmount = existingBudget.map(o => o.budgeted).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    var totalsurplusAmount = paycheckDetails.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    paycheckGet.doc(paycheckSnap.id).update({
                                        budgetDetails: existingBudget,
                                        budgetsToBeBudgeted: totalReceived - totalbudgetedAmount + totalsurplusAmount,
                                        budgetsCurrent: totalbudgetedAmount,
                                        isOverbudget: (totalReceived - totalbudgetedAmount + totalsurplusAmount) < 0 ? true : false,
                                    }).then(() => {
                                        paycheckGet.get().then((mpaycheckDocs) => {
                                            var mostrecent = [];
                                            if (mpaycheckDocs.docs.length) {
                                                mpaycheckDocs.docs.filter(o => {
                                                    if (o.data().payDateTimeStamp >= paycheckDetails.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime() && o.id != paycheckSnap.id) {
                                                        mostrecent.push(Object.assign({ id: o.id }, o.data()))
                                                    }
                                                });
                                                if (mostrecent.length) {
                                                    mostrecent = mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                    let mIndex = mostrecent[0].budgetDetails.findIndex(o => o.category === request.budgetline.category)
                                                    if (mIndex != -1) {
                                                        mostrecent[0].budgetDetails[pIndex].budgeted = (mostrecent[0].budgetDetails[pIndex].budgeted - request.budgetline.budgeted) + request.amount;
                                                        mostrecent[0].budgetDetails[pIndex].available = (mostrecent[0].budgetDetails[pIndex].available - request.budgetline.budgeted) + request.amount;
                                                    }
                                                    var mtotalReceived = mostrecent[0].totalReceived === 0 ? mostrecent[0].totalExpected : mostrecent[0].totalReceived;
                                                    var mtotalspentAmount = mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                        return a + b;
                                                    }, 0);
                                                    var mtotalbudgetedAmount = mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                        return a + b;
                                                    }, 0);
                                                    var mtotalsurplusAmount = mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                        return a + b;
                                                    }, 0);
                                                    paycheckGet.doc(mostrecent[0].id).update({
                                                        budgetDetails: mostrecent[0].budgetDetails,
                                                        budgetsToBeBudgeted: mtotalReceived - mtotalbudgetedAmount + mtotalsurplusAmount,
                                                        budgetsCurrent: mtotalbudgetedAmount,
                                                        budgetsAvailable: mtotalReceived - mtotalspentAmount + mtotalsurplusAmount,
                                                        isOverbudget: (mtotalReceived - mtotalbudgetedAmount + mtotalsurplusAmount) < 0 ? true : false,
                                                        isOverspent: (mtotalReceived - mtotalspentAmount + mtotalsurplusAmount) < 0 ? true : false
                                                    }).then(() => {

                                                        return res.status(200).send({
                                                            success: true,
                                                            message: "update all paychecks"
                                                        })

                                                    }).catch(() => {
                                                        return res.status(200).send({
                                                            success: true,
                                                            message: "update all paychecks"
                                                        })

                                                    })
                                                }
                                                else {
                                                    return res.status(200).send({
                                                        success: true,
                                                        message: "update all paychecks"
                                                    })
                                                }
                                            }
                                        })
                                    }).catch((err) => {
                                        console.log(err)
                                        return res.status(200).send({
                                            success: false,
                                            message: JSON.stringify(err)
                                        });
                                    })
                                }
                            })
                        }
                    }
                }).catch((err) => {
                    console.log(err);
                    return res.status(200).send({
                        success: false,
                        message: "income source is not exists"
                    });
                })
            }
            else {
                return res.status(200).send({
                    success: false,
                    message: "income source is not exists"
                });
            }
        }).catch((err) => {
            console.log(err);
            return res.status(200).send({
                success: false,
                message: JSON.stringify(err)
            });
        })

    })
});

exports.changePaychecks = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        const params = req.body;
        var old = params.old_paycheck;
        var _new = params.new_paycheck
        var transaction = params.transaction;
        const incomeRef = admin.firestore().collection("income_source").doc(params.userId).collection("incomes");
        const userTransaction = admin.firestore().collection('user_transaction').doc(params.userId).collection('transactions');
        const userplaidTransaction = admin.firestore().collection('user_plaid_transaction').doc(params.userId).collection('transactions');
        const goalRef = admin.firestore().collection("users").doc(params.userId).collection("goals");
        if (old.incomeid && old.id) {
            incomeRef.doc(old.incomeid).collection('paychecks').doc(old.id).get().then(function (paycheckData) {
                let _details = paycheckData.data();
                // -----------income-----------
                if (transaction.type === "income") {
                    var totalReceived = (_details.totalReceived - Math.abs(old.amount)) === 0 ? _details.totalExpected : _details.totalReceived - Math.abs(old.amount)
                    var totalspentAmount = _details.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                        return a + b;
                    }, 0);
                    var totalBudgetAmount = _details.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                        return a + b;
                    }, 0);
                    var totalsurplusBudgetTemplate = _details.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                        return a + b;
                    }, 0);
                    _details.receivedPaycheckTransaction = _details.receivedPaycheckTransaction.filter(o => o != transaction.id);
                    incomeRef.doc(old.incomeid).collection('paychecks').doc(old.id).update({
                        totalReceived: admin.firestore.FieldValue.increment(- Math.abs(old.amount)),
                        receivedPaycheckTransaction: _details.receivedPaycheckTransaction,
                        budgetsCurrent: totalBudgetAmount,
                        budgetsToBeBudgeted: totalReceived - totalBudgetAmount + totalsurplusBudgetTemplate,
                        budgetsAvailable: totalReceived - totalspentAmount + totalsurplusBudgetTemplate,
                        isOverbudget: (totalReceived - totalBudgetAmount + totalsurplusBudgetTemplate) < 0 ? true : false,
                        isOverspent: (totalReceived - totalspentAmount + totalsurplusBudgetTemplate) < 0 ? true : false,
                    }).then(function () {
                        incomeRef.doc(old.incomeid).collection('paychecks').get().then((query) => {
                            var Mostrecent = [];
                            query.docs.filter(o => {
                                if (o.data().payDateTimeStamp > _details.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                    Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                    Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                    return;
                                }
                            })
                            if (Mostrecent.length) {
                                var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                    return a + b;
                                }, 0);
                                var recentBudgetedAmount = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                    return a + b;
                                }, 0);
                                var recentsurplusAmount = Mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                    return a + b;
                                }, 0);
                                incomeRef.doc(old.incomeid).collection("paychecks").doc(Mostrecent[0].id).update({
                                    "budgetsCurrent": recentBudgetedAmount,
                                    "budgetsAvailable": recentReceived - recentspentAmount + recentsurplusAmount,
                                    "isOverspent": (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false,
                                    "budgetsToBeBudgeted": recentReceived - recentBudgetedAmount + recentsurplusAmount,
                                    "isOverbudget": (recentReceived - recentBudgetedAmount + recentsurplusAmount) < 0 ? true : false
                                }).then(() => {
                                    assignNewPaycheck(old, _new, transaction);
                                }).catch(function (err) {
                                    console.log(err);
                                    return res.status(200).send({ success: false, message: err })
                                });
                            }
                            else {
                                assignNewPaycheck(old, _new, transaction);
                            }
                            function assignNewPaycheck(previous, next, trans) {
                                incomeRef.doc(next.incomeSourceId).collection('paychecks').doc(next.paycheckId).get().then(function (PaycheckSnap) {
                                    let _newPaycheck = PaycheckSnap.data();
                                    var totalReceived1 = (_newPaycheck.totalReceived + Math.abs(previous.amount)) === 0 ? _newPaycheck.totalExpected : _newPaycheck.totalReceived + Math.abs(previous.amount)
                                    var totalspentAmount1 = _newPaycheck.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    var totalBudgetAmount1 = _newPaycheck.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    var totalsurplusBudgetTemplate1 = _newPaycheck.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    _newPaycheck.receivedPaycheckTransaction.push(trans.id);
                                    incomeRef.doc(next.incomeSourceId).collection('paychecks').doc(next.paycheckId).update({
                                        totalReceived: admin.firestore.FieldValue.increment(Math.abs(old.amount)),
                                        receivedPaycheckTransaction: _newPaycheck.receivedPaycheckTransaction,
                                        budgetsToBeBudgeted: totalReceived1 - totalBudgetAmount1 + totalsurplusBudgetTemplate1,
                                        budgetsAvailable: totalReceived1 - totalspentAmount1 + totalsurplusBudgetTemplate1,
                                        budgetsCurrent: totalBudgetAmount1,
                                        isOverbudget: (totalReceived1 - totalBudgetAmount1 + totalsurplusBudgetTemplate1) < 0 ? true : false,
                                        isOverspent: (totalReceived1 - totalspentAmount1 + totalsurplusBudgetTemplate1) < 0 ? true : false
                                    }).then(() => {
                                        incomeRef.doc(next.incomeSourceId).collection('paychecks').get().then((query) => {
                                            var Mostrecent1 = [];
                                            query.docs.filter(o => {
                                                if (o.data().payDateTimeStamp > _newPaycheck.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                    Mostrecent1.push(Object.assign({ id: o.id }, o.data()));
                                                    Mostrecent1 = Mostrecent1.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                    return;
                                                }
                                            })
                                            if (Mostrecent1.length) {
                                                var recentReceived1 = Mostrecent1[0].totalReceived === 0 ? Mostrecent1[0].totalExpected : Mostrecent1[0].totalReceived;
                                                var recentspentAmount1 = Mostrecent1[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                var recentbudgetedAmount1 = Mostrecent1[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                var recentsurplusAmount1 = Mostrecent1[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                incomeRef.doc(next.incomeSourceId).collection("paychecks").doc(Mostrecent1[0].id).update({
                                                    "budgetsCurrent": recentbudgetedAmount1,
                                                    "budgetsAvailable": recentReceived1 - recentspentAmount1 + recentsurplusAmount1,
                                                    "budgetsToBeBudgeted": recentReceived1 - recentbudgetedAmount1 + recentsurplusAmount1,
                                                    "isOverbudget": (recentReceived1 - recentbudgetedAmount1 + recentsurplusAmount1) < 0 ? true : false,
                                                    "isOverspent": (recentReceived1 - recentspentAmount1 + recentsurplusAmount1) < 0 ? true : false
                                                }).then(() => {
                                                    updateTransactionPaycheckID(previous, next, trans);
                                                }).catch(function (err) {
                                                    console.log(err)
                                                    updateTransactionPaycheckID(previous, next, trans);
                                                });
                                            }
                                            else {
                                                updateTransactionPaycheckID(previous, next, trans);
                                            }


                                        }).catch(function (err) {
                                            console.log(err)
                                            updateTransactionPaycheckID(previous, next, trans);
                                        })
                                    }).catch(function (err) {
                                        return res.status(200).send({ success: false, message: err })
                                    });
                                }).catch(function (err) {
                                    return res.status(200).send({ success: false, message: err })
                                });
                            }
                        });

                    }).catch(function (err) {
                        return res.status(200).send({ success: false, message: err });
                    })
                    function updateTransactionPaycheckID(previous, next, trans) {
                        userTransaction.doc(trans.id).get().then(function (transRes) {
                            let usrTransaction = transRes.data();
                            if (usrTransaction.plaidTransId) {
                                userplaidTransaction.doc(usrTransaction.plaidTransId).get().then((plaidTrans) => {
                                    var plaidTransaction = plaidTrans.data();
                                    var findInd = plaidTransaction.assignment.findIndex(o => o == old.id)
                                    if (findInd != -1) {
                                        plaidTransaction.assignment[findInd] = _new.paycheckId;
                                    }
                                    userplaidTransaction.doc(usrTransaction.plaidTransId).update({
                                        assignment: plaidTransaction.assignment
                                    });
                                    let i = usrTransaction.assignment.findIndex(o => o.paycheckId === old.id);
                                    if (i != -1) {
                                        usrTransaction.assignment[i].paycheckId = _new.paycheckId;
                                        userTransaction.doc(transaction.id).update({ assignment: usrTransaction.assignment });
                                        return res.status(200).send({ success: true, message: "updated the transactions lll" });
                                    }
                                    else {
                                        return res.status(200).send({ success: false, message: "nothing happpen" });
                                    }
                                }).catch(err => {
                                    return res.status(200).send({ success: false, message: err })
                                })
                            }
                            else {
                                let i = usrTransaction.assignment.findIndex(o => o.paycheckId === old.id);
                                if (i != -1) {
                                    usrTransaction.assignment[i].paycheckId = _new.paycheckId;
                                    userTransaction.doc(transaction.id).update({ assignment: usrTransaction.assignment });
                                    return res.status(200).send({ success: true, message: err });
                                }
                                else {
                                    return res.status(200).send({ success: false, message: err });
                                }
                            }

                        }).catch(function (err) {
                            return res.status(200).send({ success: false, message: err });
                        })
                    }
                }
                // ------------------expenses-----------------
                else {
                    var totalReceived = (_details.totalReceived) === 0 ? _details.totalExpected : _details.totalReceived
                    let existingBudgetDetails = _details.budgetDetails;
                    let index = existingBudgetDetails.findIndex(o => o.category == transaction.category);
                    if (index != -1) {
                        existingBudgetDetails[index].transactions = existingBudgetDetails[index].transactions.filter(o => o != transaction.id);
                        existingBudgetDetails[index].spent = existingBudgetDetails[index].spent - old.amount;
                        existingBudgetDetails[index].available = existingBudgetDetails[index].available + old.amount;
                        if (existingBudgetDetails[index].available === 0 && existingBudgetDetails[index].budgeted === 0) {
                            existingBudgetDetails.splice(index, 1);
                        }
                    }
                    var totalspentAmount = existingBudgetDetails.map(o => o.spent).reduce(function (a, b) {
                        return a + b;
                    }, 0);
                    var totalBudgetAmount = existingBudgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                        return a + b;
                    }, 0);
                    var totalsurplusBudgetTemplate = _details.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                        return a + b;
                    }, 0);
                    goalRef.where("goal_incomeSource_Id", "==", old.incomeid).get().then((snap) => {
                        if (snap.docs.length) {
                            snap.docs.forEach(goal => {
                                let goalData = goal.data();
                                if (goalData.category_id === transaction.category_id) {
                                    if (goalData.goal_type === "saving") {
                                        goalData.left_amount = goalData.left_amount + Math.abs(old.amount);
                                        goalData.paid_amount = goalData.paid_amount - Math.abs(old.amount);
                                        goalData.isAccomplished = (goalData.paid_amount >= goalData.goal_amount) ? true : false;
                                        if (goalData.paid_amount >= goalData.goal_amount) {
                                            goalData.left_amount = 0;
                                        }
                                        calculateDate(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                            goalData.goal_endDate = date;
                                        });
                                    }
                                    else {
                                        goalData.left_amount = goalData.left_amount + Math.abs(old.amount);
                                        goalData.paid_amount = goalData.paid_amount - Math.abs(old.amount);
                                        goalData.isAccomplished = (goalData.left_amount === 0) ? true : false;
                                        if (goalData.paid_amount >= goalData.goal_amount) {
                                            goalData.left_amount = 0;
                                        }
                                        calculateTarget(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                            goalData.goal_endDate = date;
                                        });
                                    }
                                    goalRef.doc(goal.id).update({
                                        left_amount: goalData.left_amount,
                                        paid_amount: goalData.paid_amount,
                                        goal_endDate: goalData.goal_endDate,
                                        isAccomplished: goalData.isAccomplished
                                    });
                                }
                            });
                        }
                    });
                    incomeRef.doc(old.incomeid).collection('paychecks').doc(old.id).update({
                        budgetDetails: existingBudgetDetails,
                        budgetsCurrent: totalBudgetAmount,
                        budgetsToBeBudgeted: totalReceived - totalBudgetAmount + totalsurplusBudgetTemplate,
                        budgetsAvailable: totalReceived - totalspentAmount + totalsurplusBudgetTemplate,
                        isOverbudget: (totalReceived - totalBudgetAmount + totalsurplusBudgetTemplate) < 0 ? true : false,
                        isOverspent: (totalReceived - totalspentAmount + totalsurplusBudgetTemplate) < 0 ? true : false
                    }).then(() => {
                        incomeRef.doc(old.incomeid).collection('paychecks').get().then((query) => {
                            var Mostrecent = [];
                            query.docs.filter(o => {
                                if (o.data().payDateTimeStamp > _details.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                    Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                    Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                    return;
                                }
                            })
                            if (Mostrecent.length) {
                                let indix = Mostrecent[0].budgetDetails.findIndex(o => (o.category) == (transaction.category));
                                if (indix != -1) {
                                    Mostrecent[0].budgetDetails[indix].available = (Mostrecent[0].budgetDetails[indix].available + old.amount);
                                    Mostrecent[0].budgetDetails[indix].budgeted = (Mostrecent[0].budgetDetails[indix].budgeted + old.amount);
                                }
                                let _rindex = Mostrecent[0].rolloverBudgetTemplate.findIndex(o => o.category === transaction.category);
                                if (_rindex != -1) {
                                    Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted = Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted + old.amount;
                                    Mostrecent[0].rolloverBudgetTemplate[_rindex].available = Mostrecent[0].rolloverBudgetTemplate[_rindex].available + old.amount;
                                }
                                var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                    return a + b;
                                }, 0);
                                var recentbudgetedAmount = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                    return a + b;
                                }, 0);
                                var recentsurplusAmount = Mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                    return a + b;
                                }, 0);
                                incomeRef.doc(old.incomeid).collection("paychecks").doc(Mostrecent[0].id).update({
                                    "budgetDetails": Mostrecent[0].budgetDetails,
                                    "budgetsCurrent": recentbudgetedAmount,
                                    "rolloverBudgetTemplate": Mostrecent[0].rolloverBudgetTemplate,
                                    "budgetsAvailable": recentReceived - recentspentAmount + recentsurplusAmount,
                                    "budgetsToBeBudgeted": recentReceived - recentbudgetedAmount + recentsurplusAmount,
                                    "isOverbudget": (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                    "isOverspent": (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                }).then(() => {
                                    assignNewPaycheck(old, _new, transaction);
                                }).catch(function (err) {
                                    console.log(err)
                                    return res.status(200).send({ success: false, message: err })
                                });
                            }
                            else {
                                assignNewPaycheck(old, _new, transaction);
                            }
                            function assignNewPaycheck(previous, next, trans) {
                                incomeRef.doc(next.incomeSourceId).collection('paychecks').doc(next.paycheckId).get().then(function (PaycheckSnap) {
                                    let _newPaycheck = PaycheckSnap.data();
                                    var totalReceived1 = (_newPaycheck.totalReceived) === 0 ? _newPaycheck.totalExpected : _newPaycheck.totalReceived;
                                    var existingpaycheckBudgetDetails = _newPaycheck.budgetDetails;
                                    let index = existingpaycheckBudgetDetails.findIndex(o => o.category == trans.category);
                                    if (index != -1) {
                                        existingpaycheckBudgetDetails[index].spent = existingpaycheckBudgetDetails[index].spent + Math.abs(previous.amount);
                                        existingpaycheckBudgetDetails[index].available = existingpaycheckBudgetDetails[index].available - Math.abs(previous.amount);
                                        // existingpaycheckBudgetDetails[index].transactions = existingpaycheckBudgetDetails[index].transactions.push(trans.id);
                                        if (existingpaycheckBudgetDetails[index].transactions && existingpaycheckBudgetDetails[index].transactions.length) {
                                            existingBudgetDetails[index].transactions.push(trans.id);
                                        }
                                        else {
                                            existingBudgetDetails[index].transactions = [trans.id]
                                        }
                                    }
                                    else {
                                        existingpaycheckBudgetDetails.push({
                                            "category": trans.category,
                                            "category_id": trans.category_id,
                                            "budgeted": 0,
                                            "spent": previous.amount,
                                            "available": -previous.amount,
                                            "transactions": [trans.id]
                                        })
                                    }
                                    var totalspentAmount1 = existingpaycheckBudgetDetails.map(o => o.spent).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    var totalBudgetAmount1 = existingpaycheckBudgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    var totalsurplusBudgetTemplate1 = _newPaycheck.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    goalRef.where("goal_incomeSource_Id", "==", next.incomeSourceId).get().then((snap) => {
                                        if (snap.docs.length) {
                                            snap.docs.forEach(goal => {
                                                let goalData = goal.data();
                                                if (goalData.category_id === transaction.category_id) {
                                                    if (goalData.goal_type === "saving") {
                                                        goalData.left_amount = goalData.left_amount - Math.abs(old.amount);
                                                        goalData.paid_amount = goalData.paid_amount + Math.abs(old.amount);
                                                        goalData.isAccomplished = (goalData.paid_amount >= goalData.goal_amount) ? true : false;
                                                        if (goalData.paid_amount >= goalData.goal_amount) {
                                                            goalData.left_amount = 0;
                                                        }
                                                        calculateDate(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                            goalData.goal_endDate = date;
                                                        });
                                                    }
                                                    else {
                                                        goalData.left_amount = goalData.left_amount - Math.abs(old.amount);
                                                        goalData.paid_amount = goalData.paid_amount + Math.abs(old.amount);
                                                        goalData.isAccomplished = (goalData.left_amount === 0) ? true : false;
                                                        if (goalData.paid_amount >= goalData.goal_amount) {
                                                            goalData.left_amount = 0;
                                                        }
                                                        calculateTarget(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                            goalData.goal_endDate = date;
                                                        });
                                                    }
                                                    goalRef.doc(goal.id).update({
                                                        left_amount: goalData.left_amount,
                                                        paid_amount: goalData.paid_amount,
                                                        goal_endDate: goalData.goal_endDate,
                                                        isAccomplished: goalData.isAccomplished
                                                    });

                                                }
                                            });
                                        }
                                    });
                                    incomeRef.doc(next.incomeSourceId).collection('paychecks').doc(next.paycheckId).update({
                                        budgetDetails: existingpaycheckBudgetDetails,
                                        budgetsCurrent: totalBudgetAmount1,
                                        budgetsToBeBudgeted: totalReceived1 - totalBudgetAmount1 + totalsurplusBudgetTemplate1,
                                        budgetsAvailable: totalReceived1 - totalspentAmount1 + totalsurplusBudgetTemplate1,
                                        isOverbudget: (totalReceived1 - totalBudgetAmount1 + totalsurplusBudgetTemplate1) < 0 ? true : false,
                                        isOverspent: (totalReceived1 - totalspentAmount1 + totalsurplusBudgetTemplate1) < 0 ? true : false
                                    }).then(() => {
                                        incomeRef.doc(next.incomeSourceId).collection('paychecks').get().then((query) => {
                                            var Mostrecent1 = [];
                                            query.docs.filter(o => {
                                                if (o.data().payDateTimeStamp > _newPaycheck.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                    Mostrecent1.push(Object.assign({ id: o.id }, o.data()));
                                                    Mostrecent1 = Mostrecent1.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                    return;
                                                }
                                            })
                                            if (Mostrecent1.length) {
                                                var recentReceived1 = Mostrecent1[0].totalReceived === 0 ? Mostrecent1[0].totalExpected : Mostrecent1[0].totalReceived;
                                                var assignmentAmt = index != -1 ? existingpaycheckBudgetDetails[index].available : previous.amount;
                                                assignmentAmt = Math.abs(assignmentAmt);
                                                let indx = Mostrecent1[0].budgetDetails.findIndex(o => (o.category) == (trans.category));
                                                if (indx != -1) {
                                                    Mostrecent1[0].budgetDetails[indx].available = (Mostrecent1[0].budgetDetails[indx].available - assignmentAmt);
                                                    Mostrecent1[0].budgetDetails[indx].budgeted = Mostrecent1[0].budgetDetails[indx].budgeted - assignmentAmt;
                                                }
                                                else {
                                                    Mostrecent1[0].budgetDetails.push({
                                                        "category": trans.category,
                                                        "category_id": trans.category_id,
                                                        "budgeted": -assignmentAmt,
                                                        "spent": 0,
                                                        "available": -assignmentAmt,
                                                        "transactions": []
                                                    })
                                                }
                                                let _rindex = Mostrecent1[0].rolloverBudgetTemplate.findIndex(o => o.category == trans.category);
                                                if (_rindex != -1) {
                                                    Mostrecent1[0].rolloverBudgetTemplate[_rindex].budgeted = Mostrecent1[0].rolloverBudgetTemplate[_rindex].budgeted - assignmentAmt;
                                                    Mostrecent1[0].rolloverBudgetTemplate[_rindex].available = Mostrecent1[0].rolloverBudgetTemplate[_rindex].available - assignmentAmt;
                                                }
                                                else {
                                                    Mostrecent1[0].rolloverBudgetTemplate.push({
                                                        "category": trans.category,
                                                        "category_id": trans.category_id,
                                                        "budgeted": -assignmentAmt,
                                                        "spent": 0,
                                                        "available": -assignmentAmt,
                                                        "transactions": []
                                                    });
                                                }
                                                var recentspentAmount1 = Mostrecent1[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                var recentbudgetedAmount1 = Mostrecent1[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                var recentsurplusAmount1 = Mostrecent1[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                incomeRef.doc(next.incomeSourceId).collection("paychecks").doc(Mostrecent1[0].id).update({
                                                    budgetDetails: Mostrecent1[0].budgetDetails,
                                                    budgetsToBeBudgeted: recentReceived1 - recentbudgetedAmount1 + recentsurplusAmount1,
                                                    budgetsCurrent: recentbudgetedAmount1,
                                                    rolloverBudgetTemplate: Mostrecent1[0].rolloverBudgetTemplate,
                                                    isOverbudget: Mostrecent1[0].budgetsToBeBudgeted - assignmentAmt < 0 ? true : false,
                                                    budgetsAvailable: recentReceived1 - recentspentAmount1 + recentsurplusAmount1,
                                                    isOverspent: (recentReceived1 - recentspentAmount1 + recentsurplusAmount1) < 0 ? true : false
                                                }).then(() => {
                                                    updateTransactionPaycheckID(previous, next, trans);
                                                }).catch(function () {
                                                    updateTransactionPaycheckID(previous, next, trans);
                                                });
                                            }
                                            else {
                                                updateTransactionPaycheckID(previous, next, trans);
                                            }


                                        }).catch(function () {
                                            updateTransactionPaycheckID(previous, next, trans);
                                        });
                                        function updateTransactionPaycheckID(previous, next, trans) {
                                            userTransaction.doc(trans.id).get().then(function (transRes) {
                                                let usrTransaction = transRes.data();
                                                if (usrTransaction.plaidTransId) {
                                                    userplaidTransaction.doc(usrTransaction.plaidTransId).get().then((plaidTrans) => {
                                                        var plaidTransaction = plaidTrans.data();
                                                        var findInd = plaidTransaction.assignment.findIndex(o => o == previous.id)
                                                        if (findInd != -1) {
                                                            plaidTransaction.assignment[findInd] = next.paycheckId;
                                                        }
                                                        userplaidTransaction.doc(usrTransaction.plaidTransId).update({
                                                            assignment: plaidTransaction.assignment
                                                        });
                                                        let i = usrTransaction.assignment.findIndex(o => o.paycheckId === previous.id);
                                                        if (i != -1) {
                                                            usrTransaction.assignment[i].paycheckId = next.paycheckId;
                                                            userTransaction.doc(transaction.id).update({ assignment: usrTransaction.assignment });
                                                            return res.status(200).send({ success: true, message: 'updated transaction ww' });
                                                        }
                                                        else {
                                                            return res.status(200).send({ success: false, message: 'log level2' });
                                                        }
                                                    })
                                                }
                                                else {
                                                    let i = usrTransaction.assignment.findIndex(o => o.paycheckId === previous.id);
                                                    if (i != -1) {
                                                        usrTransaction.assignment[i].paycheckId = next.paycheckId;
                                                        userTransaction.doc(transaction.id).update({ assignment: usrTransaction.assignment });
                                                        return res.status(200).send({ success: true, message: 'updated the transaction' });
                                                    }
                                                    else {
                                                        return res.status(200).send({ success: false, message: 'log level1' });
                                                    }
                                                }

                                            }).catch(function (err) {
                                                console.log("root error", err)
                                                return res.status(200).send({ success: false, message: err })
                                            })
                                        }
                                    }).catch(function (err) {
                                        console.log("root error", err)
                                        return res.status(200).send({ success: false, message: err })
                                    })
                                }).catch(function (err) {
                                    console.log("root error", err)
                                    return res.status(200).send({ success: false, message: err })
                                });
                            }
                        });
                    }).catch(function (err) {
                        console.log("root error", err)
                        return res.status(200).send({ success: false, message: err })
                    });
                }
            }).catch(function (err) {
                console.log("root error", err)
                return res.status(400).send({ success: false, message: err })
            })
        }

    })
});

exports.checkBalance = functions.pubsub.schedule("every 4 hours").onRun(context => {
    var promises = [];
    admin.firestore().collection('users').get().then(function (user) {
        user.docs.map(o => promises.push({ id: o.id }));
        Promise.all(promises).then((userArray) => {
            let userCount = 0;
            const userTotalCount = userArray.length;
            UpdateBalances(userArray[userCount]);
            function UpdateBalances(usr) {
                userCount++;
                if (usr.id) {
                    var failedAccessTokens = [];
                    const failedTokenRef = admin.firestore().collection('users').doc(usr.id).collection('failedToken');
                    const goalRef = admin.firestore().collection('users').doc(usr.id).collection('goals');
                    const accountRef = admin.firestore().collection('accounts').doc(usr.id).collection('bank_account');
                    // -----------------------------------------------accounts update---------------------------------------
                    accountRef.get().then(function (account) {
                        if (account.docs.length) {
                            console.log("how many accounts for this user", account.docs.length, usr.id);
                            account.docs.forEach(async (acc, acc_index) => {
                                let accountToken = acc.data().accounts_tokens;
                                let bank = acc.data();
                                const bankId = acc.id;
                                // Ray-Changes
                                // client.getAccounts(accountToken, {},
                                client.accountsGet(accountToken, {},
                                    (err, result) => {
                                    // Handle err
                                    if (!err && result.accounts.length) {
                                        const accounts = result.accounts;
                                        const newBank = result.accounts.find(o => (o.account_id == bankId) || (o.name == bank.name && o.official_name == bank.official_name && o.subtype == bank.subtype));
                                        if (newBank) {
                                            console.log("new balnce is adding ", JSON.stringify(newBank));
                                            admin.firestore().collection('accounts').doc(usr.id).collection('bank_account').doc(bankId).update({
                                                balances: newBank.balances,
                                                account_id: newBank.account_id
                                            }).then(() => {
                                                console.log("account balance is updated", bankId);
                                                goalRef.where("accounts", "array-contains", bankId).get().then((onSnapshot) => {
                                                    if (onSnapshot.docs.length) {
                                                        onSnapshot.docs.forEach(snapdocs => {
                                                            let goal = snapdocs.data();
                                                            if (goal.goal_type === "debt-Reduction") {
                                                                let index = goal.bank_detail.findIndex(o => o.account_id === bankId);
                                                                if (index != -1) {
                                                                    goal.paid_amount = goal.goal_amount - newBank.balances['current'];
                                                                    goal.left_amount =  newBank.balances['current'];
                                                                    goal.isAccomplished = (goal.left_amount === 0) ? true : false;
                                                                    goal.bank_detail[index].balance = newBank.balances['current'];
                                                                    if (goal.left_amount >= goal.goal_amount) {
                                                                        goal.paid_amount = 0;
                                                                    }
                                                                    calculateTarget(goal.goal_monthly_amount, goal.left_amount, { isRepeating: goal.isRepeating, repeating: goal.repeating }).then((date) => {
                                                                        goal.goal_endDate = date;
                                                                    });
                                                                }
                                                                goalRef.doc(snapdocs.id).update({
                                                                    paid_amount: goal.paid_amount,
                                                                    left_amount: goal.left_amount,
                                                                    bank_detail: goal.bank_detail,
                                                                    isAccomplished: goal.isAccomplished,
                                                                    goal_endDate: goal.goal_endDate
                                                                }).then(function (updategoal) {
                                                                    console.log("goal is update for this users");
                                                                    sendNotification().then(() => {
                                                                        if (userCount === userTotalCount && acc_index === (account.docs.length - 1)) {
                                                                            return null;
                                                                        }
                                                                        if (acc_index === (account.docs.length - 1)) {
                                                                            addFailedToken()
                                                                        }
                                                                    });
                                                                }).catch(function (err) {
                                                                    sendNotification().then(() => {
                                                                        if (userCount === userTotalCount && acc_index === (account.docs.length - 1)) {
                                                                            return null;
                                                                        }
                                                                        if (acc_index === (account.docs.length - 1)) {
                                                                            addFailedToken()
                                                                        }
                                                                    });
                                                                });
                                                            }
                                                            else if (goal.goal_type === "saving") {
                                                                let index = goal.bank_detail.findIndex(o => o.account_id === bankId);
                                                                if (index != -1) {
                                                                    goal.paid_amount = newBank.balances['current'];
                                                                    goal.left_amount = goal.goal_amount - goal.paid_amount;
                                                                    goal.isAccomplished = (goal.goal_amount <= goal.paid_amount) ? true : false;
                                                                    goal.bank_detail[index].balance = newBank.balances['current'];
                                                                    if (goal.paid_amount >= goal.goal_amount) {
                                                                        goal.left_amount = 0;
                                                                    }
                                                                    calculateTarget(goal.goal_monthly_amount, goal.left_amount, { isRepeating: goal.isRepeating, repeating: goal.repeating }).then((date) => {
                                                                        goal.goal_endDate = date;
                                                                    });
                                                                }
                                                                goalRef.doc(snapdocs.id).update({
                                                                    paid_amount: goal.paid_amount,
                                                                    left_amount: goal.left_amount,
                                                                    bank_detail: goal.bank_detail,
                                                                    isAccomplished: goal.isAccomplished,
                                                                    goal_endDate: goal.goal_endDate
                                                                }).then(function (updategoal) {
                                                                    sendNotification().then(() => {
                                                                        if (userCount === userTotalCount && acc_index === (account.docs.length - 1)) {
                                                                            return null;
                                                                        }
                                                                        if (acc_index === (account.docs.length - 1)) {
                                                                            addFailedToken()
                                                                        }
                                                                    });
                                                                }).catch(function (err) {

                                                                    sendNotification().then(() => {
                                                                        if (userCount === userTotalCount && acc_index === (account.docs.length - 1)) {
                                                                            return null;
                                                                        }
                                                                        if (acc_index === (account.docs.length - 1)) {
                                                                            addFailedToken()
                                                                        }
                                                                    });
                                                                });
                                                            }
                                                        })
                                                    }
                                                    else {
                                                        sendNotification().then(() => {
                                                            if (userCount === userTotalCount && acc_index === (account.docs.length - 1)) {
                                                                return null;
                                                            }
                                                            if (acc_index === (account.docs.length - 1)) {
                                                                addFailedToken()
                                                            }
                                                        });
                                                    }
                                                })
                                                function sendNotification() {
                                                    return new Promise((resolve, reject) => {
                                                        let message = {
                                                            notification: {
                                                                title: `Reminder from MyFondi!`,
                                                                body: ` Your  ${newBank.name} Bank Account Balance is recently updated from plaid.`,
                                                                sound: "default"
                                                            },
                                                        };
                                                        admin.firestore().collection('users').doc(usr.id).get().then((user) => {
                                                            if (user.exists && user.data().userFcmToken) {
                                                                let userFcmToken = user.data().userFcmToken;
                                                                admin.messaging().sendToDevice(userFcmToken, message).then(res => {
                                                                    console.log("Notifications sent successfully");
                                                                    resolve({ success: true })
                                                                }).catch(err => {
                                                                    console.log("Notifications sent failed");
                                                                    resolve({ success: true })
                                                                });
                                                            }
                                                            else {
                                                                resolve({ success: true })
                                                            }
                                                        }).catch(err => {
                                                            resolve({ success: true })
                                                        });
                                                    })


                                                }
                                            }).catch(function (err) {
                                                console.log("error in Accounts bank details update : " + err)
                                            })
                                        }
                                        else {
                                            console.log("return with no changes???")
                                            if (userCount === userTotalCount && acc_index === (account.docs.length - 1)) {
                                                return null;
                                            }
                                            if (acc_index === (account.docs.length - 1)) {
                                                addFailedToken()
                                            }
                                        }
                                    }
                                    else if (err) {
                                        // handle error
                                        if (failedAccessTokens.length && (err.error_code == 'ITEM_LOGIN_REQUIRED' || err.error_code == 'INVALID_MFA' || err.error_code == 'INVALID_UPDATED_USERNAME')) {
                                            console.log("error code is matched", err.error_code, failedAccessTokens.length);
                                            let arr_index = failedAccessTokens.findIndex(o => o.access_token === accountToken)
                                            if (arr_index == -1) {
                                                failedAccessTokens.push({
                                                    linkToken: null,
                                                    lastConnection: new Date().getTime(),
                                                    access_token: accountToken,
                                                    bank_name: bank.official_name ? bank.official_name : bank.name
                                                })
                                            }
                                        }
                                        else if (err.error_code == 'ITEM_LOGIN_REQUIRED' || err.error_code == 'INVALID_MFA' || err.error_code == 'INVALID_UPDATED_USERNAME') {
                                            console.log("error code is matched", err.error_code);
                                            failedAccessTokens.push({
                                                linkToken: null,
                                                lastConnection: new Date().getTime(),
                                                access_token: accountToken,
                                                bank_name: bank.official_name ? bank.official_name : bank.name
                                            })
                                        }
                                        if (userCount === userTotalCount && acc_index === (account.docs.length - 1)) {
                                            console.log("all Users Accounts checked");
                                            return null;
                                        }
                                        if (acc_index === (account.docs.length - 1)) {
                                            addFailedToken()
                                        }
                                    }
                                });
                                function addFailedToken() {
                                    if (failedAccessTokens.length) {
                                        failedTokenRef.get().then((tokenSnap) => {
                                            if (tokenSnap.docs.length) {
                                                for (var i = 0; i < tokenSnap.docs.length; i++) {
                                                    failedTokenRef.doc(tokenSnap.docs[i].id).delete();
                                                }
                                                failedTokenRef.add({ auth_tokens: failedAccessTokens }).then(() => UpdateBalances(userArray[userCount])).catch((e) => {
                                                    console.log("failed token add error", e);
                                                    UpdateBalances(userArray[userCount])
                                                });
                                            }
                                            else {
                                                failedTokenRef.add({ auth_tokens: failedAccessTokens }).then(() => UpdateBalances(userArray[userCount])).catch((e) => {
                                                    console.log("failed token add error", e);
                                                    UpdateBalances(userArray[userCount])
                                                });
                                            }
                                        })
                                    }
                                    else {
                                        UpdateBalances(userArray[userCount]);
                                    }
                                }
                            })
                        }
                        else {
                            if (userCount === userTotalCount) {
                                console.log("all Users Accounts checked");
                                return null;
                            }
                            else {
                                UpdateBalances(userArray[userCount]);
                            }
                        }
                    }).catch(function (err) {
                        if (userCount === userTotalCount) {
                            console.log("all Users Accounts checked");
                            return null;
                        }
                        else {
                            UpdateBalances(userArray[userCount]);
                        }
                    });
                } else {
                    if (userCount === userTotalCount) {
                        console.log("all Users Accounts checked");
                        return null;
                    }
                    else {
                        UpdateBalances(userArray[userCount]);
                    }
                }

            }
        });

    }).catch(function (err) {
        console.log("error in users details getting: " + err)
    });
    return null;
});

exports.checkUserActive = functions.pubsub.schedule('00 9 * * *').onRun(context => {
    var promises = [];
    admin.firestore().collection('users').get().then(function (user) {
        const totalusers = user.docs.length;
        var userCount = 0;
        user.docs.map(o => promises.push(Object.assign({ id: o.id }, o.data())));
        checkAndSendMessage(promises[userCount])
        function checkAndSendMessage(usr) {
            userCount++;
            if (usr) {
                let usersData = usr;
                var time = new Date().getTime() - usersData.lastLoginTime;
                var durationofDays = parseInt(time / (1000 * 60 * 60 * 24));
                if ((durationofDays >= 3 || durationofDays >= 7 || durationofDays >= 14 || durationofDays >= 30) && usersData.userFcmToken) {
                    let message = {
                        notification: {
                            title: `Hello from MyFondi!`,
                            body: ` Hey ${usersData.name}, you haven't checked your budget in ${durationofDays} days. Check your budget to make sure you are not overspending.`,
                            sound: "default"
                        },
                    };
                    let userFcmToken = usersData.userFcmToken;
                    admin.messaging().sendToDevice(userFcmToken, message).then(res => {
                        console.log("Sent Successfully", res);
                        if (totalusers > userCount) {
                            checkAndSendMessage(promises[userCount])
                        }
                        else {
                            console.log('sent reminder to all users')
                        }
                    }).catch(err => {
                        console.log(err + "notification error");
                        if (totalusers > userCount) {
                            checkAndSendMessage(promises[userCount])
                        }
                        else {
                            console.log('sent reminder to all users')
                        }
                    });
                }
            }
            else {
                if (totalusers > userCount) {
                    checkAndSendMessage(promises[userCount])
                }
                else {
                    console.log('sent reminder to all users')
                }
            }
        }
    })
    return null;
});

exports.createCustomer = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        const tokenId = req.get('Authorization').split('Bearer ')[1];
        const priceId = BASIC_PRICE_ID;
        admin.auth().verifyIdToken(tokenId)
            .then((decodedToken) => {
                stripe.customers
                    .create({
                        description: "Test Customer",
                        email: req.body.email,
                        name: req.body.cusName
                    })
                    .then(async (customer) => {

                        let paymentMethod;
                        try {
                            paymentMethod = await stripe.paymentMethods.attach(
                                req.body.sourceToken.id, {
                                customer: customer.id,
                            });
                        }
                        catch (error) {
                            return res.status(200).send({ error: { message: error.message } });
                        }
                        let updateCustomerDefaultPaymentMethod = await stripe.customers.update(customer.id,
                            {
                                invoice_settings: {
                                    default_payment_method: paymentMethod.id,
                                },
                            });
                        // Create the subscription
                        const subscription = await stripe.subscriptions.create({
                            customer: customer.id,
                            items: [{ price: req.body.priceId }],
                            expand: ["latest_invoice.payment_intent"],
                        });
                        admin.firestore().collection('subscriptions').doc(req.body.userId).collection("subscription_detail").doc(subscription.id).set(subscription)
                        let userRef = admin.firestore().collection('users').doc(req.body.userId);
                        userRef.get().then((userSnap) => {
                            let user = userSnap.data();
                            user['customer_id'] = customer.id;
                            user['subscription_id'] = subscription.id;
                            user['sub_status'] = subscription.status;
                            userRef.set(user);
                            return res.status(200).send({
                                success: true,
                                cus: customer,
                                subscription: subscription
                            });
                        })
                    })
                    .catch((err) => {
                        console.log(err);
                        return res.status(400).send({ success: false, error: err });
                    });
            }).catch((error) => {
                console.log(error);
                return res.status(400).send({
                    success: false,
                    error: error,
                });
            });
    })
});

exports.createFuturePaychecks = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        const data = req.body;
        // Ray-Changes
        // client.getAccounts(data.curr_access_token, {
            client.accountsGet(data.curr_access_token, {
        }, (err, result) => {
            if (!err && result.accounts.length) {
                updateAccountsByToken(data.curr_access_token, data.old_access_token, result.accounts, data.lastConnectionDate).then((args) => {
                    if (args.success) {
                        deleteToken(data.uid, data.old_access_token);
                    }
                    else {
                        res.status(200).send({
                            success: false,
                            message: args.message
                        })
                    }
                }).catch((error) => {
                    console.log(error);
                    res.status(200).send({
                        success: false,
                        message: error.message
                    })
                })
            }
            else {
                console.log(JSON.stringify(err))
                res.status(400).send({
                    success: false,
                    message: err
                })
            }
        })

        function updateAccountsByToken(curr_token, old_token, accounts, lastConnectionDate) {
            return new Promise((resolve, reject) => {
                const bank_Account = admin.firestore().collection('accounts').doc(data.uid).collection('bank_account');
                const goalRef = admin.firestore().collection('users').doc(data.id).collection('goals');
                bank_Account.where("accounts_tokens", "==", old_token).get().then((tokenSnap) => {
                    console.log("accounts matched with the token", tokenSnap.docs.length);
                    if (tokenSnap.docs.length) {
                        var matched = 0;
                        tokenSnap.docs.forEach(async function (tokendoc, indexToken) {
                            const account = tokendoc.data();
                            const bankId = tokendoc.id;
                            let index_Acc = accounts.findIndex(o => o.name == account.name && o.official_name == account.official_name && o.subtype == account.subtype);
                            if (index_Acc != -1) {
                                matched++;
                                let update = await bank_Account.doc(bankId)
                                    .update({
                                        accounts_tokens: curr_token,
                                        account_id: accounts[index_Acc].account_id,
                                        balances: accounts[index_Acc].balances
                                    }).then(() => {
                                        const displayForm = new Date().toISOString().substring(0, 10);
                                        const displayTo = new Date(lastConnectionDate).toISOString().substring(0, 10);
                                        goalRef.where("accounts", "array-contains", bankId).get().then((onSnapshot) => {
                                            if (onSnapshot.docs.length) {
                                                onSnapshot.docs.forEach(snapdocs => {
                                                    let goal = snapdocs.data();
                                                    if (goal.goal_type === "debt-Reduction") {
                                                        let index = goal.bank_detail.findIndex(o => o.account_id === bankId);
                                                        if (index != -1) {
                                                            goal.paid_amount = newBank.balances['current'];
                                                            goal.left_amount = goal.goal_amount - newBank.balances['current'];
                                                            goal.isAccomplished = (goal.left_amount === 0) ? true : false;
                                                            goal.bank_detail[index].balance = newBank.balances['current'];
                                                            if (goal.paid_amount >= goal.goal_amount) {
                                                                goal.left_amount = 0;
                                                            }
                                                            calculateTarget(goal.goal_monthly_amount, goal.left_amount, { isRepeating: goal.isRepeating, repeating: goal.repeating }).then((date) => {
                                                                goal.goal_endDate = date;
                                                            });
                                                        }
                                                        goalRef.doc(snapdocs.id).update({
                                                            paid_amount: goal.paid_amount,
                                                            left_amount: goal.left_amount,
                                                            bank_detail: goal.bank_detail,
                                                            isAccomplished: goal.isAccomplished,
                                                            goal_endDate: goal.goal_endDate
                                                        }).then(function (updategoal) {
                                                            console.log("goal is update for this users");
                                                            sendNotification().then(() => {
                                                                fetchMissingTransactions({
                                                                    access_token: curr_token,
                                                                    account_id: accounts[index_Acc].account_id,
                                                                    db_account_id: bankId,
                                                                    banktype: account.type,
                                                                    start_date: displayForm,
                                                                    end_date: displayTo,
                                                                    userId: data.uid
                                                                }).then(() => {
                                                                    console.log("transaction added in user transactions")
                                                                    if ((tokenSnap.docs.length - 1) == indexToken && matched > 0) {
                                                                        resolve({
                                                                            success: true,
                                                                            message: "account activated successfully!"
                                                                        })
                                                                    }
                                                                }).catch((e) => {
                                                                    console.log("error while adding new transactions", JSON.stringify(e))
                                                                    if ((tokenSnap.docs.length - 1) == indexToken && matched > 0) {
                                                                        resolve({
                                                                            success: true,
                                                                            message: "account activated successfully!"
                                                                        })
                                                                    }
                                                                })
                                                            });
                                                        }).catch(function (err) {
                                                            sendNotification().then(() => {
                                                                fetchMissingTransactions({
                                                                    access_token: curr_token,
                                                                    account_id: accounts[index_Acc].account_id,
                                                                    db_account_id: bankId,
                                                                    banktype: account.type,
                                                                    start_date: displayForm,
                                                                    end_date: displayTo,
                                                                    userId: data.uid
                                                                }).then(() => {
                                                                    console.log("transaction added in user transactions")
                                                                    if ((tokenSnap.docs.length - 1) == indexToken && matched > 0) {
                                                                        resolve({
                                                                            success: true,
                                                                            message: "account activated successfully!"
                                                                        })
                                                                    }
                                                                }).catch((e) => {
                                                                    console.log("error while adding new transactions", JSON.stringify(e))
                                                                    if ((tokenSnap.docs.length - 1) == indexToken && matched > 0) {
                                                                        resolve({
                                                                            success: true,
                                                                            message: "account activated successfully!"
                                                                        })
                                                                    }
                                                                })
                                                            });
                                                        });
                                                    }
                                                    else if (goal.goal_type === "saving") {
                                                        let index = goal.bank_detail.findIndex(o => o.account_id === bankId);
                                                        if (index != -1) {
                                                            goal.paid_amount = newBank.balances['current'];
                                                            goal.left_amount = goal.goal_amount - goal.paid_amount;
                                                            goal.isAccomplished = (goal.goal_amount <= goal.paid_amount) ? true : false;
                                                            goal.bank_detail[index].balance = newBank.balances['current'];
                                                            if (goal.paid_amount >= goal.goal_amount) {
                                                                goal.left_amount = 0;
                                                            }
                                                            calculateTarget(goal.goal_monthly_amount, goal.left_amount, { isRepeating: goal.isRepeating, repeating: goal.repeating }).then((date) => {
                                                                goal.goal_endDate = date;
                                                            });
                                                        }
                                                        goalRef.doc(snapdocs.id).update({
                                                            paid_amount: goal.paid_amount,
                                                            left_amount: goal.left_amount,
                                                            bank_detail: goal.bank_detail,
                                                            isAccomplished: goal.isAccomplished,
                                                            goal_endDate: goal.goal_endDate
                                                        }).then(function (updategoal) {
                                                            sendNotification().then(() => {
                                                                fetchMissingTransactions({
                                                                    access_token: curr_token,
                                                                    account_id: accounts[index_Acc].account_id,
                                                                    db_account_id: bankId,
                                                                    banktype: account.type,
                                                                    start_date: displayForm,
                                                                    end_date: displayTo,
                                                                    userId: data.uid
                                                                }).then(() => {
                                                                    console.log("transaction added in user transactions")
                                                                    if ((tokenSnap.docs.length - 1) == indexToken && matched > 0) {
                                                                        resolve({
                                                                            success: true,
                                                                            message: "account activated successfully!"
                                                                        })
                                                                    }
                                                                }).catch((e) => {
                                                                    console.log("error while adding new transactions", JSON.stringify(e))
                                                                    if ((tokenSnap.docs.length - 1) == indexToken && matched > 0) {
                                                                        resolve({
                                                                            success: true,
                                                                            message: "account activated successfully!"
                                                                        })
                                                                    }
                                                                })
                                                            });
                                                        }).catch(function (err) {

                                                            sendNotification().then(() => {
                                                                fetchMissingTransactions({
                                                                    access_token: curr_token,
                                                                    account_id: accounts[index_Acc].account_id,
                                                                    db_account_id: bankId,
                                                                    banktype: account.type,
                                                                    start_date: displayForm,
                                                                    end_date: displayTo,
                                                                    userId: data.uid
                                                                }).then(() => {
                                                                    console.log("transaction added in user transactions")
                                                                    if ((tokenSnap.docs.length - 1) == indexToken && matched > 0) {
                                                                        resolve({
                                                                            success: true,
                                                                            message: "account activated successfully!"
                                                                        })
                                                                    }
                                                                }).catch((e) => {
                                                                    console.log("error while adding new transactions", JSON.stringify(e))
                                                                    if ((tokenSnap.docs.length - 1) == indexToken && matched > 0) {
                                                                        resolve({
                                                                            success: true,
                                                                            message: "account activated successfully!"
                                                                        })
                                                                    }
                                                                })
                                                            });
                                                        });
                                                    }
                                                })
                                            }
                                            else {
                                                sendNotification().then(() => {
                                                    fetchMissingTransactions({
                                                        access_token: curr_token,
                                                        account_id: accounts[index_Acc].account_id,
                                                        db_account_id: bankId,
                                                        banktype: account.type,
                                                        start_date: displayForm,
                                                        end_date: displayTo,
                                                        userId: data.uid
                                                    }).then(() => {
                                                        console.log("transaction added in user transactions")
                                                        if ((tokenSnap.docs.length - 1) == indexToken && matched > 0) {
                                                            resolve({
                                                                success: true,
                                                                message: "account activated successfully!"
                                                            })
                                                        }
                                                    }).catch((e) => {
                                                        console.log("error while adding new transactions", JSON.stringify(e))
                                                        if ((tokenSnap.docs.length - 1) == indexToken && matched > 0) {
                                                            resolve({
                                                                success: true,
                                                                message: "account activated successfully!"
                                                            })
                                                        }
                                                    })
                                                });
                                            }
                                        })
                                        function sendNotification() {
                                            return new Promise((resolve, reject) => {
                                                let message = {
                                                    notification: {
                                                        title: `Reminder from MyFondi!`,
                                                        body: ` Your  ${newBank.name} Bank Account Balance is recently updated from plaid.`,
                                                        sound: "default"
                                                    },
                                                };
                                                admin.firestore().collection('users').doc(usr.id).get().then((user) => {
                                                    if (user.exists && user.data().userFcmToken) {
                                                        let userFcmToken = user.data().userFcmToken;
                                                        admin.messaging().sendToDevice(userFcmToken, message).then(res => {
                                                            console.log("Notifications sent successfully");
                                                            resolve({ success: true })
                                                        }).catch(err => {
                                                            console.log("Notifications sent failed");
                                                            resolve({ success: true })
                                                        });
                                                    }
                                                    else {
                                                        resolve({ success: true })
                                                    }
                                                }).catch(err => {
                                                    resolve({ success: true })
                                                });
                                            })


                                        }


                                    }).catch((error) => {
                                        console.log("error during account update", JSON.stringify(error))
                                        if ((tokenSnap.docs.length - 1) == indexToken && matched > 0) {
                                            resolve({
                                                success: true,
                                                message: "account activated successfully!"
                                            })
                                        }
                                        else if ((tokenSnap.docs.length - 1) == indexToken && matched == 0) {
                                            resolve({
                                                success: true,
                                                message: "Account Not Matched!"
                                            })
                                        }

                                    })

                            }

                        })
                    }
                    else {
                        resolve({
                            success: true,
                            message: "Account Not Matched!"
                        })
                    }
                }).catch((err) => {
                    resolve({
                        success: false,
                        message: "Account Not Matched!"
                    })
                })
            })
        }
        function fetchMissingTransactions(body) {
            return new Promise((resolve, reject) => {
                client.transactionsGet(body.access_token, body.end_date, body.start_date, {
                }, async (err, result) => {
                    if (!err) {
                        let resultTransactions = result.transactions;
                        console.log("new transcations", JSON.stringify(resultTransactions))
                        if (resultTransactions.length) {
                            var promises = [];
                            const uid = body.userId;
                            var existingTransactions = [];
                            const transRef = admin.firestore().collection("user_plaid_transaction").doc(body.userId).collection("transactions");
                            existingTransactions = resultTransactions.filter(x => x.account_id === body.account_id);
                            existingTransactions.forEach((element, index) => {
                                existingTransactions[index].account_id = body.db_account_id;
                            });
                            transRef.where("account_id", "==", body.db_account_id).get().then((snapShots) => {
                                if (snapShots.docs.length) {
                                    snapShots.docs.forEach(transa => existingTransactions.push(transa.data()));
                                }
                            }).catch((error) => {
                                console.log(error);
                                resolve({
                                    success: false,
                                    error: error
                                });
                            });
                            const transactions = existingTransactions.filter((v, i, a) => a.findIndex(t => (t.account_id === v.account_id && t.amount === v.amount && t.name === v.name && t.merchant_name === v.merchant_name && t.date === v.date && t.category_id === v.category_id && t.transaction_type === v.transaction_type)) === i);
                            transactions.forEach((trans) => {
                                promises.push(transRef.doc(trans.transaction_id).set(Object.assign({ "active_transaction": true, "bank_Type": body.banktype }, trans), { merge: true }));
                            });
                            var counter = 0;
                            Promise.all(promises)
                                .then(() => {
                                    if (transactions.length) {
                                        onCreateAssign(transactions[counter], body.banktype, uid)
                                        function onCreateAssign(trans, bank_type, userId) {
                                            let incomeRef = admin.firestore().collection("income_source").doc(userId).collection("incomes");
                                            let usrtransRef = admin.firestore().collection("user_transaction").doc(userId).collection("transactions");
                                            if (trans) {
                                                const remainingAmount = trans.remainingAmount != undefined ? trans.remainingAmount : trans.amount;
                                                if (remainingAmount < 0 && bank_type === "credit") {
                                                    counter++;
                                                    if (counter < transactions.length) {
                                                        onCreateAssign(transactions[counter], bank_type, uid);
                                                    }
                                                    if (counter >= transactions.length) {
                                                        resolve({
                                                            success: true,
                                                            message: "data saved successfully"
                                                        });
                                                    }
                                                }
                                                else {
                                                    incomeRef.get().then((incomeSnap) => {
                                                        if (incomeSnap.docs.length) {
                                                            var iCount = 0;
                                                            var paycheckArray = [];
                                                            var Mostrecent = [];
                                                            incomeSnap.docs.forEach(incomeELe => {
                                                                const incomeSourceData = incomeELe.data();
                                                                incomeRef.doc(incomeELe.id).collection("paychecks").get().then((paycheckSnap) => {
                                                                    iCount++;
                                                                    paycheckSnap.docs.forEach((paycheckEle, _indexP) => {
                                                                        paycheckArray.push(Object.assign({ "income_id": incomeELe.id }, { "income_name": incomeELe.data().name },
                                                                            { "income_isRepeating": incomeELe.data().isRepeating }, { "income_budgetTemplate": incomeELe.data().budgetTemplate },
                                                                            { "id": paycheckEle.id }, paycheckEle.data()));
                                                                        if (iCount === incomeSnap.docs.length && (paycheckSnap.docs.length - 1 === _indexP)) {
                                                                            paycheckArray.filter(o => {
                                                                                if (o.payDateTimeStamp <= (new Date().getTime()) && (o.payDateTimeStamp <= (new Date(trans.date).getTime()))) {
                                                                                    Mostrecent.push(o);
                                                                                    Mostrecent = Mostrecent.sort(function (a, b) { return b.payDateTimeStamp - a.payDateTimeStamp })
                                                                                    return;
                                                                                }
                                                                            });
                                                                            if (Mostrecent.length) {
                                                                                trans.category = trans.category ? trans.category : ["miscellaneous"];
                                                                                let category;
                                                                                for (var i = 0; i < trans.category.length; i++) {
                                                                                    category = i == 0 ? trans.category[i] : category + "-" + trans.category[i];
                                                                                }
                                                                                const remainingAmount = trans.remainingAmount != undefined ? trans.remainingAmount : trans.amount;
                                                                                const categoryName = category;
                                                                                var d = Object.assign({ "remainingAmount": remainingAmount }, { "categoryName": categoryName }, trans);
                                                                                usrtransRef.add({
                                                                                    "name": trans.name,
                                                                                    "category": categoryName,
                                                                                    "category_id": trans.category_id,
                                                                                    "transactionDateTime": trans.date ? new Date(trans.date) : new Date(),
                                                                                    "transactionDateTimeStamp": trans.date ? new Date(trans.date).getTime() : new Date().getTime(),
                                                                                    "amount": remainingAmount,
                                                                                    "assignment": [{ amount: remainingAmount, paycheckId: Mostrecent[0].id }],
                                                                                    "plaidTransId": trans.transaction_id,
                                                                                    "type": (remainingAmount < 0) ? "income" : "expense"
                                                                                }).then(function (transResult) {
                                                                                    admin.firestore().collection("user_plaid_transaction").doc(userId).collection("transactions").doc(trans.transaction_id).update({
                                                                                        remainingAmount: 0,
                                                                                        status: "Completed",
                                                                                        assignment: [Mostrecent[0].id]
                                                                                    }).then(() => {
                                                                                        assignplaidTransaction({ "transaction": d, "paycheck": Mostrecent[0] }, userId, transResult.id);
                                                                                    }).catch(err => {
                                                                                        resolve({
                                                                                            success: true,
                                                                                            error: err,
                                                                                            message: "data saved successfully"
                                                                                        });
                                                                                    });
                                                                                    function assignplaidTransaction(params, userId, usrTrnsId) {
                                                                                        const addedTransactionId = usrTrnsId;
                                                                                        let incomeRef = admin.firestore().collection("income_source").doc(userId).collection("incomes");
                                                                                        var remainAmount = params.transaction.remainingAmount;
                                                                                        //--------------------------income----------------------------
                                                                                        if (params.transaction.remainingAmount < 0) {
                                                                                            const incomeSourceId = params.paycheck.income_id;
                                                                                            let paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(params.paycheck.id);
                                                                                            var paycheckData = params.paycheck;
                                                                                            var totalReceived = paycheckData.totalReceived === 0 ? Math.abs(remainAmount) : paycheckData.totalReceived + Math.abs(remainAmount)
                                                                                            var totalspentAmount = paycheckData.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                                                return a + b;
                                                                                            }, 0);
                                                                                            var totalBudgetAmount = paycheckData.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                                                return a + b;
                                                                                            }, 0);
                                                                                            var totalsurplusAmount = paycheckData.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                                                return a + b;
                                                                                            }, 0);
                                                                                            paycheckGet.update({
                                                                                                totalReceived: admin.firestore.FieldValue.increment(Math.abs(remainAmount)),
                                                                                                receivedPaycheckTransaction: admin.firestore.FieldValue.arrayUnion(usrTrnsId),
                                                                                                budgetsAvailable: Math.abs(totalReceived) - totalspentAmount + totalsurplusAmount,
                                                                                                budgetsToBeBudgeted: Math.abs(totalReceived) - totalBudgetAmount + totalsurplusAmount,
                                                                                                budgetsCurrent: totalBudgetAmount,
                                                                                                isOverbudget: (Math.abs(totalReceived) - totalBudgetAmount + totalsurplusAmount) < 0 ? true : false,
                                                                                                isOverspent: (Math.abs(totalReceived) - totalspentAmount + totalsurplusAmount) < 0 ? true : false
                                                                                            }).then(() => {
                                                                                                let recentPaycheck = [];
                                                                                                incomeRef.doc(incomeSourceId).collection("paychecks").get().then((query) => {
                                                                                                    query.docs.filter(o => {
                                                                                                        if (o.data().payDateTimeStamp > paycheckData.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                                                                            recentPaycheck.push(Object.assign({ id: o.id }, o.data()));
                                                                                                            recentPaycheck = recentPaycheck.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                                                                            return;
                                                                                                        }
                                                                                                    });
                                                                                                    if (recentPaycheck.length) {
                                                                                                        var surplusBudgetTemplate = [];
                                                                                                        surplusBudgetTemplate = recentPaycheck[0].surplusBudgetTemplate;
                                                                                                        var recentReceived = Math.abs(recentPaycheck[0].totalReceived === 0 ? recentPaycheck[0].totalExpected : recentPaycheck[0].totalReceived);
                                                                                                        var recentspentAmount = recentPaycheck[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                                                            return a + b;
                                                                                                        }, 0);
                                                                                                        var recentbudgetedAmount = recentPaycheck[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                                                            return a + b;
                                                                                                        }, 0);
                                                                                                        var recentsurplusAmount = surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                                                            return a + b;
                                                                                                        }, 0);
                                                                                                        incomeRef.doc(incomeSourceId).collection("paychecks").doc(recentPaycheck[0].id).update({
                                                                                                            "surplusBudgetTemplate": surplusBudgetTemplate,
                                                                                                            "budgetsCurrent": recentbudgetedAmount,
                                                                                                            "budgetsToBeBudgeted": recentReceived - recentbudgetedAmount + recentsurplusAmount,
                                                                                                            "isOverbudget": (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                                                                            "budgetsAvailable": recentReceived - recentspentAmount + recentsurplusAmount,
                                                                                                            "isOverspent": (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                                                                        }).then(() => {
                                                                                                            counter++;
                                                                                                            if (counter === transactions.length) {
                                                                                                                resolve({
                                                                                                                    success: true,
                                                                                                                    message: "data saved successfully"
                                                                                                                });
                                                                                                            } else {
                                                                                                                onCreateAssign(transactions[counter], bank_type, uid);
                                                                                                            }
                                                                                                        }).catch(() => {
                                                                                                            counter++;
                                                                                                            if (counter === transactions.length) {
                                                                                                                resolve({
                                                                                                                    success: true,
                                                                                                                    message: "data saved successfully"
                                                                                                                });
                                                                                                            } else {
                                                                                                                onCreateAssign(transactions[counter], bank_type, uid);
                                                                                                            }
                                                                                                        });
                                                                                                    }
                                                                                                    else {
                                                                                                        counter++;
                                                                                                        if (counter === transactions.length) {
                                                                                                            resolve({
                                                                                                                success: true,
                                                                                                                message: "data saved successfully"
                                                                                                            });
                                                                                                        } else {
                                                                                                            onCreateAssign(transactions[counter], bank_type, uid);
                                                                                                        }
                                                                                                    }
                                                                                                }).catch((error) => {
                                                                                                    counter++;
                                                                                                    if (counter === transactions.length) {
                                                                                                        resolve({
                                                                                                            success: true,
                                                                                                            message: "data saved successfully"
                                                                                                        });
                                                                                                    } else {
                                                                                                        onCreateAssign(transactions[counter], bank_type, uid);
                                                                                                    }
                                                                                                })

                                                                                            }).catch((error) => {
                                                                                                counter++;
                                                                                                if (counter === transactions.length) {
                                                                                                    resolve({
                                                                                                        success: true,
                                                                                                        error: error,
                                                                                                        message: "data saved successfully"
                                                                                                    });
                                                                                                } else {
                                                                                                    onCreateAssign(transactions[counter], bank_type, uid);
                                                                                                }
                                                                                            })
                                                                                        }
                                                                                        //-----------------Expense---------------------
                                                                                        else {
                                                                                            const incomeSourceId = params.paycheck.income_id;
                                                                                            let paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(params.paycheck.id);
                                                                                            var paycheckData = params.paycheck;
                                                                                            var existingBudgetDetails = paycheckData.budgetDetails;
                                                                                            let index = existingBudgetDetails.findIndex(o => o.category === params.transaction.categoryName);
                                                                                            if (index != -1) {
                                                                                                existingBudgetDetails[index].spent = existingBudgetDetails[index].spent + Math.abs(remainAmount);
                                                                                                existingBudgetDetails[index].available = existingBudgetDetails[index].available - Math.abs(remainAmount);
                                                                                                if (existingBudgetDetails[index].transactions && existingBudgetDetails[index].transactions.length) {
                                                                                                    existingBudgetDetails[index].transactions.push(addedTransactionId);
                                                                                                }
                                                                                                else {
                                                                                                    existingBudgetDetails[index].transactions = [addedTransactionId]
                                                                                                }
                                                                                            }
                                                                                            else {
                                                                                                existingBudgetDetails.push({
                                                                                                    "category": params.transaction.categoryName,
                                                                                                    "category_id": params.transaction.category_id,
                                                                                                    "budgeted": 0,
                                                                                                    "spent": remainAmount,
                                                                                                    "available": -remainAmount,
                                                                                                    "transactions": [addedTransactionId]
                                                                                                })
                                                                                            }
                                                                                            var totalReceived = paycheckData.totalReceived === 0 ? paycheckData.totalExpected : paycheckData.totalReceived;
                                                                                            var totalspentAmount = existingBudgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                                                return a + b;
                                                                                            }, 0);
                                                                                            var totalbudgetedAmount = existingBudgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                                                return a + b;
                                                                                            }, 0);
                                                                                            var totalsurplusAmount = paycheckData.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                                                return a + b;
                                                                                            }, 0);
                                                                                            paycheckGet.update({
                                                                                                budgetDetails: existingBudgetDetails,
                                                                                                budgetsCurrent: totalbudgetedAmount,
                                                                                                budgetsToBeBudgeted: totalReceived - totalbudgetedAmount + totalsurplusAmount,
                                                                                                isOverbudget: (totalReceived - totalbudgetedAmount + totalsurplusAmount) < 0 ? true : false,
                                                                                                budgetsAvailable: totalReceived - totalspentAmount + totalsurplusAmount,
                                                                                                isOverspent: paycheckData.budgetsAvailable - remainAmount < 0 ? true : false
                                                                                            }).then(() => {
                                                                                                let recentPaycheck = [];
                                                                                                incomeRef.doc(incomeSourceId).collection("paychecks").get().then((query) => {
                                                                                                    query.docs.filter(o => {
                                                                                                        if (o.data().payDateTimeStamp > paycheckData.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                                                                            recentPaycheck.push(Object.assign({ id: o.id }, o.data()));
                                                                                                            recentPaycheck = recentPaycheck.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                                                                            return;
                                                                                                        }
                                                                                                    });
                                                                                                    if (recentPaycheck.length) {

                                                                                                        let indx = recentPaycheck[0].budgetDetails.findIndex(o => o.category == params.transaction.categoryName);
                                                                                                        if (indx != -1) {
                                                                                                            recentPaycheck[0].budgetDetails[indx].available = (recentPaycheck[0].budgetDetails[indx].available + (-Math.abs(remainAmount)));
                                                                                                            recentPaycheck[0].budgetDetails[indx].budgeted = recentPaycheck[0].budgetDetails[indx].budgeted + (-Math.abs(remainAmount));
                                                                                                        }
                                                                                                        else {
                                                                                                            recentPaycheck[0].budgetDetails.push({
                                                                                                                "category": params.transaction.categoryName,
                                                                                                                "category_id": params.transaction.category_id,
                                                                                                                "budgeted": (-Math.abs(remainAmount)),
                                                                                                                "spent": 0,
                                                                                                                "available": (-Math.abs(remainAmount)),
                                                                                                                "transactions": []
                                                                                                            })
                                                                                                        }
                                                                                                        var recentReceived = recentPaycheck[0].totalReceived === 0 ? recentPaycheck[0].totalExpected : recentPaycheck[0].totalReceived;
                                                                                                        var recentspentAmount = recentPaycheck[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                                                            return a + b;
                                                                                                        }, 0);
                                                                                                        var recentsurplusAmount = recentPaycheck[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                                                            return a + b;
                                                                                                        }, 0);
                                                                                                        var recentbudgetedAmount = recentPaycheck[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                                                            return a + b;
                                                                                                        }, 0);
                                                                                                        incomeRef.doc(incomeSourceId).collection("paychecks").doc(recentPaycheck[0].id).update({
                                                                                                            budgetDetails: recentPaycheck[0].budgetDetails,
                                                                                                            budgetsToBeBudgeted: recentReceived - recentbudgetedAmount + recentsurplusAmount,
                                                                                                            budgetsCurrent: recentbudgetedAmount,
                                                                                                            surplusBudgetTemplate: recentPaycheck[0].surplusBudgetTemplate,
                                                                                                            budgetsAvailable: recentReceived - recentspentAmount + recentsurplusAmount,
                                                                                                            isOverbudget: (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                                                                            isOverspent: (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                                                                        }).then(() => {
                                                                                                            updateGoals(remainAmount, params.transaction.category_id);

                                                                                                        }).catch((e) => {
                                                                                                            counter++;
                                                                                                            if (counter === transactions.length) {
                                                                                                                resolve({
                                                                                                                    success: true,
                                                                                                                    error: e,
                                                                                                                    message: "data saved successfully"
                                                                                                                });
                                                                                                            } else {
                                                                                                                onCreateAssign(transactions[counter], bank_type, uid);
                                                                                                            }
                                                                                                        });
                                                                                                    }
                                                                                                    else {
                                                                                                        updateGoals(remainAmount, params.transaction.category_id);
                                                                                                    }
                                                                                                    function updateGoals(amount, category_id) {
                                                                                                        var goalRef = admin.firestore().collection('users').doc(userId).collection('goals')
                                                                                                        goalRef.where("goal_incomeSource_Id", "==", incomeSourceId).get().then((snap) => {
                                                                                                            if (snap.docs.length) {
                                                                                                                snap.docs.forEach((goal, indexA) => {
                                                                                                                    if (goal.data().category_id === category_id) {
                                                                                                                        var goalData = goal.data();
                                                                                                                        if (goalData.goal_type === "saving") {
                                                                                                                            goalData.left_amount = goalData.left_amount - Math.abs(amount);
                                                                                                                            goalData.paid_amount = goalData.paid_amount + Math.abs(amount);
                                                                                                                            goalData.isAccomplished = (goalData.paid_amount >= goalData.goal_amount) ? true : false;
                                                                                                                            if (goalData.paid_amount >= goalData.goal_amount) {
                                                                                                                                goalData.left_amount = 0;
                                                                                                                            }
                                                                                                                            calculateDate(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                                                                                                goalData.goal_endDate = date;
                                                                                                                                goalRef.doc(goal.id).update({
                                                                                                                                    left_amount: goalData.left_amount,
                                                                                                                                    paid_amount: goalData.paid_amount,
                                                                                                                                    goal_endDate: goalData.goal_endDate,
                                                                                                                                    isAccomplished: goalData.isAccomplished
                                                                                                                                });
                                                                                                                            });
                                                                                                                        }
                                                                                                                        else {
                                                                                                                            goalData.left_amount = goalData.left_amount - Math.abs(amount);
                                                                                                                            goalData.paid_amount = goalData.paid_amount + Math.abs(amount);
                                                                                                                            goalData.isAccomplished = (goalData.paid_amount >= goalData.goal_amount) ? true : false;
                                                                                                                            if (goalData.paid_amount >= goalData.goal_amount) {
                                                                                                                                goalData.left_amount = 0;
                                                                                                                            }
                                                                                                                            calculateTarget(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                                                                                                goalData.goal_endDate = date;
                                                                                                                                goalRef.doc(goal.id).update({
                                                                                                                                    left_amount: goalData.left_amount,
                                                                                                                                    paid_amount: goalData.paid_amount,
                                                                                                                                    goal_endDate: goalData.goal_endDate,
                                                                                                                                    isAccomplished: goalData.isAccomplished
                                                                                                                                });
                                                                                                                            });
                                                                                                                        }
                                                                                                                    }
                                                                                                                    if (snap.docs.length - 1 === indexA) {
                                                                                                                        counter++;
                                                                                                                        if (counter === transactions.length) {
                                                                                                                            resolve({
                                                                                                                                success: true,
                                                                                                                                message: "data saved successfully"
                                                                                                                            });
                                                                                                                        } else {
                                                                                                                            onCreateAssign(transactions[counter], bank_type, uid);
                                                                                                                        }
                                                                                                                    }
                                                                                                                });
                                                                                                            }
                                                                                                            else {
                                                                                                                counter++;
                                                                                                                if (counter === transactions.length) {
                                                                                                                    resolve({
                                                                                                                        success: true,
                                                                                                                        message: "data saved successfully"
                                                                                                                    });
                                                                                                                } else {
                                                                                                                    onCreateAssign(transactions[counter], bank_type, uid);
                                                                                                                }
                                                                                                            }
                                                                                                        })

                                                                                                    }
                                                                                                })
                                                                                                    .catch((error) => {
                                                                                                        counter++;
                                                                                                        if (counter === transactions.length) {
                                                                                                            resolve({
                                                                                                                success: true,
                                                                                                                error: error,
                                                                                                                message: "data saved successfully"
                                                                                                            });
                                                                                                        } else {
                                                                                                            onCreateAssign(transactions[counter], bank_type, uid);
                                                                                                        }
                                                                                                    });


                                                                                            }).catch((error) => {
                                                                                                counter++;
                                                                                                if (counter === transactions.length) {
                                                                                                    resolve({
                                                                                                        success: true,
                                                                                                        error: error,
                                                                                                        message: "data saved successfully"
                                                                                                    });
                                                                                                } else {
                                                                                                    onCreateAssign(transactions[counter], bank_type, uid);
                                                                                                }
                                                                                            })
                                                                                        }
                                                                                    }
                                                                                }).catch(function (error) {
                                                                                    counter++;
                                                                                    if (counter === transactions.length) {
                                                                                        resolve({
                                                                                            success: true,
                                                                                            error: error,
                                                                                            message: "data saved successfully"
                                                                                        });
                                                                                    } else {
                                                                                        onCreateAssign(transactions[counter], bank_type, uid);
                                                                                    }
                                                                                });
                                                                            }
                                                                            else {
                                                                                counter++;
                                                                                if (counter === transactions.length) {
                                                                                    resolve({
                                                                                        success: true,
                                                                                        message: "data saved successfully"
                                                                                    });
                                                                                } else {
                                                                                    onCreateAssign(transactions[counter], bank_type, uid);
                                                                                }
                                                                            }
                                                                        }
                                                                    });
                                                                }).catch(err => {
                                                                    counter++;
                                                                    if (counter === transactions.length) {
                                                                        resolve({
                                                                            success: true,
                                                                            error: "level 1",
                                                                            message: "data saved successfully"
                                                                        });
                                                                    } else {
                                                                        onCreateAssign(transactions[counter], bank_type, uid);
                                                                    }
                                                                })

                                                            })
                                                        }
                                                        else {
                                                            counter++;
                                                            if (counter === transactions.length) {
                                                                resolve({
                                                                    success: true, error: "income go",
                                                                    message: "data saved successfully"
                                                                });
                                                            } else {
                                                                onCreateAssign(transactions[counter], bank_type, uid);
                                                            }
                                                        }
                                                    }).catch(err => {
                                                        counter++;
                                                        if (counter === transactions.length) {
                                                            resolve({
                                                                success: true,
                                                                message: "data saved successfully"
                                                            });
                                                        } else {
                                                            onCreateAssign(transactions[counter], bank_type, uid);
                                                        }

                                                    })
                                                }

                                            }
                                            else {
                                                resolve({
                                                    success: true,
                                                    message: "data saved successfully"
                                                });
                                            }
                                        }
                                    }
                                    else {
                                        resolve({
                                            success: true,
                                            message: "data saved successfully"
                                        });
                                    }
                                });
                        }
                        else {
                            console.log("no transaction for the given Account")
                            resolve({
                                success: false,
                                message: "New Transaction Not Found on Plaid"
                            });
                        }
                    } else if (err) {
                        console.log("err", JSON.stringify(err))
                        resolve({
                            success: false,
                            error: err
                        });
                    }

                });
            })
        }
        function deleteToken(userId, token) {
            const failedToken = admin.firestore().collection('users').doc(userId).collection('failedToken');
            failedToken.get().then((tokenSnap) => {
                if (tokenSnap.docs.length) {
                    var auth_tokens = tokenSnap.docs[0].data().auth_tokens;
                    auth_tokens = auth_tokens.filter(o => o.access_token != token);
                    if (auth_tokens.length) {
                        failedToken.doc(tokenSnap.docs[0].id).update({
                            auth_tokens: auth_tokens
                        })
                        res.status(200).send({
                            success: true,
                            message: "token refresh success"
                        })
                    } else {
                        failedToken.doc(tokenSnap.docs[0].id).delete();
                        res.status(200).send({
                            success: true,
                            message: "token refresh success"
                        })
                    }
                }
                else {
                    res.status(200).send({
                        success: true,
                        message: "token refresh success"
                    })
                }
            }).catch(err1 => {
                console.log(err1);
                res.status(200).send({
                    success: false,
                    message: err1.message
                })
            })
        }
    });
});

exports.createLinkToken = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        // Ray-Changes
        // client.createLinkToken({
        client.linkTokenCreate({
            user: {
                client_user_id: "viHwW0qzamY4pQqYxVKmJNHTz0o2"
            },
            client_name: 'Crococode',
            products: ['transactions'],
            country_codes: ['US'],
            language: 'en',
            // webhook: 'https://sample.webhook.com',
        }, function (err, apiResponse) {
            const linkToken = apiResponse.link_token;
            if (!err) {
                return response.status(200).send({
                    results: apiResponse
                });
            } else {
                return response.status(400).send({
                    error: err
                });
            }
        });
    })
});

exports.dailybugetTemplateJobCopy = functions.pubsub.schedule('every 5 minutes').onRun(context => {
    // const usersRef = admin.firestore().collection("income_source").where("active", "==", true);
    // usersRef.get().then(async (snapUsers) => {
    var userpromises = [];
    // if (snapUsers.docs.length) {
    //     snapUsers.docs.map(async (o) => userpromises.push({ id: o.id }));
    userpromises.push({ id: 'Z8eCiLx0iCZzIXYpwBLSBqtQ9DE3' })
    if (userpromises.length) {
        var usrCount = 0;
        const totalUserActive = userpromises.length;
        getUsersIncomeSources(userpromises[usrCount].id);
        function getUsersIncomeSources(user_Id) {
            usrCount++;
            if (user_Id) {
                const incomeRef = admin.firestore().collection("income_source").doc(user_Id).collection("incomes").where("isRepeating", "==", true);
                incomeRef.get().then(async (snap) => {
                    var incomePromises = [];
                    if (snap.docs.length) {
                        var incomeCount = 0;
                        const totalIncomesource = snap.docs.length;
                        snap.docs.map(async (o) => incomePromises.push(Object.assign({ id: o.id }, o.data())));
                        // loop incomesources of the user found the todays paycheck if not return to next user
                        getIncomeSource(incomePromises[incomeCount])
                        function getIncomeSource(incomeObj) {
                            incomeCount++;
                            let payDates = incomeObj.repeating.payDays.map(e => e.toDate().toLocaleDateString());
                            let index = payDates.findIndex(o => o == new Date().toLocaleDateString())

                            if (index != -1) {
                                callback(incomeObj.id);
                                function callback(incomeId) {
                                    // console.log("h2::" + incomeId + "h3::" + user_Id);//Ray changes
                                    admin.firestore().collection("income_source").doc(user_Id).collection("incomes").doc(incomeId).collection('paychecks').get().then((snapPaycheck) => {
                                        var mostRecentPaycheck = [], filterCurrent;
                                        const numberOfPaychecks = (snapPaycheck.docs.length - 1)
                                        snapPaycheck.docs.filter(e => {
                                            if (new Date(e.data().payDateTimeStamp).toLocaleDateString() == new Date().toLocaleDateString()) {
                                                return filterCurrent = Object.assign({ id: e.id }, e.data())
                                            }
                                        });
                                        snapPaycheck.docs.forEach((element, paycheckIndex) => {
                                            if (element.data().payDateTimeStamp <= new Date().getTime() && new Date(element.data().payDateTimeStamp).toLocaleDateString() != new Date().toLocaleDateString()) {
                                                mostRecentPaycheck.push(Object.assign({ id: element.id }, element.data()));
                                                mostRecentPaycheck = mostRecentPaycheck.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp);
                                                if (mostRecentPaycheck.length && paycheckIndex == numberOfPaychecks) {
                                                    // console.log("processing the income")//Ray changes
                                                    updateMostRecentTemplate().then((r) => {
                                                        // console.log('paycheck updated Sccessfully...', paycheckIndex)//Ray changes
                                                        if (paycheckIndex == numberOfPaychecks) {
                                                            if (totalIncomesource > incomeCount) {
                                                                getIncomeSource(incomePromises[incomeCount])
                                                            }
                                                            else {
                                                                if (usrCount < totalUserActive) {
                                                                    getUsersIncomeSources(userpromises[usrCount].id)
                                                                } else {
                                                                    return "all users length is processed";
                                                                }
                                                            }
                                                        }
                                                    }).catch((e) => {
                                                        // console.log('paycheck updated Error...', paycheckIndex)//Ray changes
                                                        if (paycheckIndex == numberOfPaychecks) {
                                                            if (totalIncomesource > incomeCount) {
                                                                getIncomeSource(incomePromises[incomeCount])
                                                            }
                                                            else {
                                                                if (usrCount < totalUserActive) {
                                                                    getUsersIncomeSources(userpromises[usrCount].id)
                                                                } else {
                                                                    return "all users length is processed";
                                                                }
                                                            }
                                                        }
                                                    });
                                                }
                                                else if (paycheckIndex == numberOfPaychecks) {
                                                    if (totalIncomesource > incomeCount) {
                                                        getIncomeSource(incomePromises[incomeCount])
                                                    }
                                                    else {
                                                        if (usrCount < totalUserActive) {
                                                            getUsersIncomeSources(userpromises[usrCount].id)
                                                        } else {
                                                            return "all users length is processed";
                                                        }
                                                    }
                                                }

                                            }
                                            else {
                                                // console.log("b1");//Ray changes
                                                if (mostRecentPaycheck.length && paycheckIndex == numberOfPaychecks) {
                                                    // console.log("processing the income")//Ray changes
                                                    updateMostRecentTemplate().then((r) => {
                                                        // console.log('else case -> paycheck updated Sccessfully...', paycheckIndex)//Ray changes
                                                        if (paycheckIndex == numberOfPaychecks) {
                                                            if (totalIncomesource > incomeCount) {
                                                                getIncomeSource(incomePromises[incomeCount])
                                                            }
                                                            else {
                                                                if (usrCount < totalUserActive) {
                                                                    getUsersIncomeSources(userpromises[usrCount].id)
                                                                } else {
                                                                    return "all users length is processed";
                                                                }
                                                            }
                                                        }
                                                    }).catch((e) => {
                                                        // console.log('else  case -> paycheck updated Error...', paycheckIndex)//Ray changes
                                                        if (paycheckIndex == numberOfPaychecks) {
                                                            if (totalIncomesource > incomeCount) {
                                                                getIncomeSource(incomePromises[incomeCount])
                                                            }
                                                            else {
                                                                if (usrCount < totalUserActive) {
                                                                    getUsersIncomeSources(userpromises[usrCount].id)
                                                                } else {
                                                                    return "all users length is processed";
                                                                }
                                                            }
                                                        }
                                                    });
                                                }
                                                else if (paycheckIndex == numberOfPaychecks) {
                                                    // console.log("e4::" + totalIncomesource + "::" + incomeCount);//Ray changes
                                                    if (totalIncomesource > incomeCount) {
                                                        getIncomeSource(incomePromises[incomeCount])
                                                    }
                                                    else {
                                                        // console.log("e5::" + totalUserActive + "::" + usrCount);//Ray changes
                                                        if (usrCount < totalUserActive) {
                                                            getUsersIncomeSources(userpromises[usrCount].id)
                                                        } else {
                                                            return "all users length is processed";
                                                        }
                                                    }
                                                }
                                            }
                                            function updateMostRecentTemplate() {
                                                return new Promise((resolve, reject) => {
                                                    // console.log(user_Id + "mostrecent paycheck budget" + mostRecentPaycheck[0].id, JSON.stringify(mostRecentPaycheck[0].budgetDetails))//Ray changes
                                                    mostRecentPaycheck[0].budgetDetails.map((budget, bIndex) => {
                                                        // console.log(JSON.stringify(mostRecentPaycheck[0].budgetDetails), bIndex);//Ray changes
                                                        // find if budgetline itme is already in current paycheck
                                                        let templateObject = {
                                                            "category": budget.category,
                                                            "category_id": budget.category_id,
                                                            "budgeted": budget.available,
                                                            "spent": 0,
                                                            "available": budget.available,
                                                            "transactions": [],
                                                            "goalId": budget.goalId ? budget.goalId : []
                                                        };
                                                        let eIndex = filterCurrent.budgetDetails.findIndex(o => o.category === budget.category);
                                                        if (eIndex != -1) {
                                                            filterCurrent.budgetDetails[eIndex].budgeted = filterCurrent.budgetDetails[eIndex].budgeted + budget.available;
                                                            filterCurrent.budgetDetails[eIndex].available = filterCurrent.budgetDetails[eIndex].available + budget.available;
                                                        }
                                                        else {
                                                            filterCurrent.budgetDetails.push(templateObject);
                                                        }
                                                        if (filterCurrent.rolloverBudgetTemplate) {
                                                            let _rIndex = filterCurrent.rolloverBudgetTemplate.findIndex(o => o.category === budget.category);
                                                            if (-_rIndex != -1) {
                                                                filterCurrent.rolloverBudgetTemplate[_rIndex].budgeted = filterCurrent.rolloverBudgetTemplate[_rIndex].budgeted + budget.available;
                                                                filterCurrent.rolloverBudgetTemplate[_rIndex].available = filterCurrent.rolloverBudgetTemplate[_rIndex].available + budget.available;
                                                            }
                                                            else {
                                                                filterCurrent.rolloverBudgetTemplate.push(templateObject);
                                                            }
                                                        }

                                                    });
                                                    var totalReceived = filterCurrent.totalReceived === 0 ? filterCurrent.totalExpected : filterCurrent.totalReceived;
                                                    var totalspentAmount = filterCurrent.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                        return a + b;
                                                    }, 0);
                                                    var totalbudgetedAmount = filterCurrent.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                        return a + b;
                                                    }, 0);
                                                    if (filterCurrent.rollovered) {
                                                        resolve({ success: true })
                                                    }
                                                    else {
                                                        admin.firestore().collection("income_source").doc(user_Id).collection("incomes").doc(incomeId).collection('paychecks').doc(filterCurrent.id).update({
                                                            budgetDetails: filterCurrent.budgetDetails,
                                                            budgetsToBeBudgeted: totalReceived - totalbudgetedAmount,
                                                            budgetsCurrent: totalbudgetedAmount,
                                                            rollovered: true,
                                                            budgetsAvailable: totalReceived - totalspentAmount,
                                                            isOverbudget: (totalReceived - totalbudgetedAmount) < 0 ? true : false,
                                                            isOverspent: (totalReceived - totalspentAmount) < 0 ? true : false
                                                        }).then(() => {
                                                            // console.log(user_Id + "what budget we have saving.." + filterCurrent.id, JSON.stringify(filterCurrent.budgetDetails))//Ray changes
                                                            resolve({ success: true })
                                                        }).catch((err) => {
                                                            // console.log(err)//Ray changes
                                                            reject(err)
                                                        });
                                                    }

                                                })
                                            }
                                        });
                                    }).catch((error) => {
                                        // console.log(error);//Ray changes
                                        if (totalIncomesource > incomeCount) {
                                            getIncomeSource(incomePromises[incomeCount])
                                        }
                                        else {
                                            if (usrCount < totalUserActive) {
                                                getUsersIncomeSources(userpromises[usrCount].id)
                                            } else {
                                                return "all users length is processed";
                                            }
                                        }
                                    })
                                }
                            }
                            else {
                                if (totalIncomesource > incomeCount) {
                                    getIncomeSource(incomePromises[incomeCount])
                                }
                                else {
                                    if (usrCount < totalUserActive) {
                                        getUsersIncomeSources(userpromises[usrCount].id)
                                    } else {
                                        return "all users length is processed";
                                    }
                                }
                            }
                        }
                    }
                    else {
                        if (usrCount < totalUserActive) {
                            getUsersIncomeSources(userpromises[usrCount].id)
                        } else {
                            return "all users length is processed";
                        }
                    }

                }).catch(err => {
                    // console.log(err);//Ray changes
                    if (usrCount < totalUserActive) {
                        getUsersIncomeSources(userpromises[usrCount].id)
                    }
                    else {
                        return "all users length is processed";
                    }
                })
            }
            else {
                if (usrCount < totalUserActive) {
                    getUsersIncomeSources(userpromises[usrCount].id)
                }
                else {
                    return "all users length is processed";

                }
            }
        }
    }
    else {
        return "no user in the give db query>>";
    }
    // }
    // }).catch((error) => {
    //     return "error while user info getting from firebase";
    // });
});

exports.dailybugetTemplateJobRequest = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        const usersRef = admin.firestore().collection("income_source").where("active", "==", true);
        usersRef.get().then(async (snapUsers) => {
            var userpromises = [];
            if (snapUsers.docs.length) {
                snapUsers.docs.map(async (o) => userpromises.push({ id: o.id }));
                if (userpromises.length) {
                    var usrCount = 0;
                    const totalUserActive = userpromises.length;
                    getUsersIncomeSources(userpromises[usrCount].id);
                    function getUsersIncomeSources(user_Id) {
                        usrCount++;
                        if (user_Id) {
                            const incomeRef = admin.firestore().collection("income_source").doc(user_Id).collection("incomes").where("isRepeating", "==", true);
                            incomeRef.get().then(async (snap) => {
                                var incomePromises = [];
                                if (snap.docs.length) {
                                    var incomeCount = 0;
                                    const totalIncomesource = snap.docs.length;
                                    snap.docs.map(async (o) => incomePromises.push(Object.assign({ id: o.id }, o.data())));
                                    // loop incomesources of the user found the todays paycheck if not return to next user
                                    getIncomeSource(incomePromises[incomeCount])
                                    function getIncomeSource(incomeObj) {
                                        incomeCount++;
                                        let payDates = incomeObj.repeating.payDays.map(e => e.toDate().toLocaleDateString());
                                        console.log(JSON.stringify(payDates))
                                        let index = payDates.findIndex(o => o == new Date('02/25/2022').toLocaleDateString())

                                        if (index != -1) {
                                            callback(incomeObj.id);
                                            function callback(incomeId) {
                                                console.log("h2::" + incomeId + "h3::" + user_Id);
                                                admin.firestore().collection("income_source").doc(user_Id).collection("incomes").doc(incomeId).collection('paychecks').get().then((snapPaycheck) => {
                                                    var mostRecentPaycheck = [], filterCurrent;
                                                    const numberOfPaychecks = (snapPaycheck.docs.length - 1)
                                                   snapPaycheck.docs.filter(e => {
                                                        if (new Date(e.data().payDateTimeStamp).toLocaleDateString() == new Date('02/25/2022').toLocaleDateString()) {
                                                            return filterCurrent = Object.assign({ id: e.id }, e.data())
                                                        }
                                                    });
                                                    snapPaycheck.docs.forEach((element, paycheckIndex) => {
                                                        if (element.data().payDateTimeStamp <= new Date('02/25/2022').getTime() && new Date(element.data().payDateTimeStamp).toLocaleDateString() != new Date('02/25/2022').toLocaleDateString()) {
                                                            mostRecentPaycheck.push(Object.assign({ id: element.id }, element.data()));
                                                            mostRecentPaycheck = mostRecentPaycheck.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp);
                                                            if (mostRecentPaycheck.length && paycheckIndex == numberOfPaychecks) {
                                                                console.log("processing the income")
                                                                mostRecentPaycheck[0].budgetDetails.forEach((budget, bIndex) => {
                                                                    console.log(mostRecentPaycheck[0].budgetDetails, bIndex);
                                                                    // find if budgetline itme is already in current paycheck
                                                                    let eIndex = filterCurrent.budgetDetails.findIndex(o => o.category === budget.category);
                                                                    if (eIndex != -1) {
                                                                        filterCurrent.budgetDetails[eIndex].budgeted = filterCurrent.budgetDetails[eIndex].budgeted + budget.available;
                                                                        filterCurrent.budgetDetails[eIndex].available = filterCurrent.budgetDetails[eIndex].available + budget.available;
                                                                    }
                                                                    else {
                                                                        filterCurrent.budgetDetails.push({
                                                                            "category": budget.category,
                                                                            "category_id": budget.category_id,
                                                                            "budgeted": budget.available,
                                                                            "spent": 0,
                                                                            "available": budget.available,
                                                                            "transactions": [],
                                                                            "goalId": budget.goalId ? budget.goalId : []
                                                                        })
                                                                    }
                                                                    if (bIndex == (mostRecentPaycheck[0].budgetDetails.length - 1)) {
                                                                        // here we update the current paychck of the user
                                                                        console.log("eet1");
                                                                        console.log(filterCurrent.budgetDetails);
                                                                        var totalReceived = filterCurrent.totalReceived === 0 ? filterCurrent.totalExpected : filterCurrent.totalReceived;
                                                                        var totalspentAmount = filterCurrent.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                            return a + b;
                                                                        }, 0);
                                                                        var totalbudgetedAmount = filterCurrent.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                            return a + b;
                                                                        }, 0);
                                                                        admin.firestore().collection("income_source").doc(user_Id).collection("incomes").doc(incomeId).collection('paychecks').doc(filterCurrent.id).update({
                                                                            budgetDetails: filterCurrent.budgetDetails,
                                                                            budgetsToBeBudgeted: totalReceived - totalbudgetedAmount,
                                                                            budgetsCurrent: totalbudgetedAmount,
                                                                            budgetsAvailable: totalReceived - totalspentAmount,
                                                                            isOverbudget: (totalReceived - totalbudgetedAmount) < 0 ? true : false,
                                                                            isOverspent: (totalReceived - totalspentAmount) < 0 ? true : false
                                                                        }).then(() => {
                                                                            // check the all paycheck are set or not 
                                                                            if (paycheckIndex == numberOfPaychecks) {
                                                                              if (totalIncomesource > incomeCount) {
                                                                                    getIncomeSource(incomePromises[incomeCount])
                                                                                }
                                                                                else {
                                                                                   if (usrCount < totalUserActive) {
                                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                                    } else {
                                                                                        res.send("all user checked level 7");
                                                                                    }
                                                                                }
                                                                            }
                                                                        }).catch((err) => {
                                                                            // check the all paycheck are set or not 
                                                                            if (paycheckIndex == numberOfPaychecks) {
                                                                                if (totalIncomesource > incomeCount) {
                                                                                    getIncomeSource(incomePromises[incomeCount])
                                                                                }
                                                                                else {
                                                                                   if (usrCount < totalUserActive) {
                                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                                    } else {
                                                                                        res.send("all user checked level 7");
                                                                                    }
                                                                                }
                                                                            }
                                                                        })

                                                                    }

                                                                });
                                                            }
                                                            else if (paycheckIndex == numberOfPaychecks) {
                                                                if (totalIncomesource > incomeCount) {
                                                                    getIncomeSource(incomePromises[incomeCount])
                                                                }
                                                                else {
                                                                  if (usrCount < totalUserActive) {
                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                    } else {
                                                                        res.send("all user checked level 7n");
                                                                    }
                                                                }
                                                            }

                                                        }
                                                        else {
                                                            console.log("b1");
                                                            if (mostRecentPaycheck.length && paycheckIndex == numberOfPaychecks) {
                                                                mostRecentPaycheck[0].budgetDetails.forEach((budget, bIndex) => {
                                                                    let eIndex = filterCurrent.budgetDetails.findIndex(o => o.category === budget.category);
                                                                    if (eIndex != -1) {
                                                                        filterCurrent.budgetDetails[eIndex].budgeted = filterCurrent.budgetDetails[eIndex].budgeted + budget.available;
                                                                        filterCurrent.budgetDetails[eIndex].available = filterCurrent.budgetDetails[eIndex].available + budget.available;
                                                                    }
                                                                    else {
                                                                        filterCurrent.budgetDetails.push({
                                                                            "category": budget.category,
                                                                            "category_id": budget.category_id,
                                                                            "budgeted": budget.available,
                                                                            "spent": 0,
                                                                            "available": budget.available,
                                                                            "transactions": [],
                                                                            "goalId": budget.goalId ? budget.goalId : []
                                                                        })
                                                                    }
                                                                    if (bIndex === (mostRecentPaycheck[0].budgetDetails.length - 1)) {
                                                                        // here we update the current paychck of the user
                                                                        console.log("b2");
                                                                        console.log(JSON.stringify(filterCurrent.budgetDetails));
                                                                        var totalReceived = filterCurrent.totalReceived === 0 ? filterCurrent.totalExpected : filterCurrent.totalReceived;
                                                                        var totalspentAmount = filterCurrent.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                            return a + b;
                                                                        }, 0);
                                                                        var totalbudgetedAmount = filterCurrent.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                            return a + b;
                                                                        }, 0);
                                                                        admin.firestore().collection("income_source").doc(user_Id).collection("incomes").doc(incomeId).collection('paychecks').doc(filterCurrent.id).update({
                                                                            budgetDetails: filterCurrent.budgetDetails,
                                                                            budgetsToBeBudgeted: totalReceived - totalbudgetedAmount,
                                                                            budgetsCurrent: totalbudgetedAmount,
                                                                            budgetsAvailable: totalReceived - totalspentAmount,
                                                                            isOverbudget: (totalReceived - totalbudgetedAmount) < 0 ? true : false,
                                                                            isOverspent: (totalReceived - totalspentAmount) < 0 ? true : false
                                                                        }).then(() => {
                                                                            // check the all paycheck are set or not 
                                                                            console.log("b3::" + paycheckIndex);
                                                                            if (paycheckIndex == numberOfPaychecks) {
                                                                                console.log("b4::" + totalIncomesource + "::" + incomeCount);
                                                                                if (totalIncomesource > incomeCount) {
                                                                                    getIncomeSource(incomePromises[incomeCount])
                                                                                }
                                                                                else {
                                                                                    console.log("b5::" + totalUserActive + "::" + usrCount);
                                                                                    if (usrCount < totalUserActive) {
                                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                                    } else {
                                                                                        res.send("all user checked level 7");
                                                                                    }
                                                                                }
                                                                            }
                                                                        }).catch((err) => {
                                                                            console.log(err + "b3e::" + paycheckIndex);
                                                                            // check the all paycheck are set or not 
                                                                            if (paycheckIndex == numberOfPaychecks) {
                                                                                console.log("b4::" + totalIncomesource + "::" + incomeCount);
                                                                                if (totalIncomesource > incomeCount) {
                                                                                    getIncomeSource(incomePromises[incomeCount])
                                                                                }
                                                                                else {
                                                                                    console.log("b5::" + totalUserActive + "::" + usrCount);
                                                                                    if (usrCount < totalUserActive) {
                                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                                    } else {
                                                                                        res.send("all user checked level 7");
                                                                                    }
                                                                                }
                                                                            }
                                                                        })

                                                                    }
                                                                });
                                                            }
                                                            else if (paycheckIndex == numberOfPaychecks) {
                                                                console.log("e4::" + totalIncomesource + "::" + incomeCount);
                                                                if (totalIncomesource > incomeCount) {
                                                                    getIncomeSource(incomePromises[incomeCount])
                                                                }
                                                                else {
                                                                    console.log("e5::" + totalUserActive + "::" + usrCount);
                                                                    if (usrCount < totalUserActive) {
                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                    } else {
                                                                        res.send("all user checked level e7");
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    });
                                                }).catch((error) => {
                                                    console.log(error);
                                                    if (totalIncomesource > incomeCount) {
                                                        getIncomeSource(incomePromises[incomeCount])
                                                    }
                                                    else {
                                                        if (usrCount < totalUserActive) {
                                                            getUsersIncomeSources(userpromises[usrCount].id)
                                                        } else {
                                                            res.send("all user checked level 4");
                                                        }
                                                    }
                                                })
                                            }
                                        }
                                        else {
                                            if (totalIncomesource > incomeCount) {
                                                getIncomeSource(incomePromises[incomeCount])
                                            }
                                            else {
                                                if (usrCount < totalUserActive) {
                                                    getUsersIncomeSources(userpromises[usrCount].id)
                                                } else {
                                                    res.send("all user checked level 4");
                                                }
                                            }
                                        }
                                    }
                                }
                                else {
                                    if (usrCount < totalUserActive) {
                                        getUsersIncomeSources(userpromises[usrCount].id)
                                    } else {
                                        res.send("all user checked level 3");
                                    }
                                }

                            }).catch(err => {
                                console.log(err);
                                if (usrCount < totalUserActive) {
                                    getUsersIncomeSources(userpromises[usrCount].id)
                                }
                                else {
                                    res.send("all user checked level 2");
                                }
                            })
                        }
                        else {
                            if (usrCount < totalUserActive) {
                                getUsersIncomeSources(userpromises[usrCount].id)
                            }
                            else {
                                console.log('all users length is', totalUserActive);
                                res.send("all user checked level 1");

                            }
                        }
                    }

                }
                else {
                    console.log('no user found for run this query')
                    res.send("no users");
                }
            }
        }).catch((error) => {
            console.log("er while the runu", error)
            res.send("er while the runu");
        });
    })
});

exports.dailyFetchTransactions = functions.pubsub.schedule("every 8 hours").onRun(context => {
    const usersRef = admin.firestore().collection("accounts").where("active", "==", true);
    usersRef.get().then(async (snapUsers) => {
        var userpromises = [];
        if (snapUsers.docs.length) {
            userpromises = snapUsers.docs.map(o => o.id);
            Promise.all(userpromises)
                .then((resuserIds) => {
                    const totalUserCount = userpromises.length;
                    var userCount = 0;
                    runnallQueriesParallel(userpromises[userCount])
                    function runnallQueriesParallel(uid) {
                        const user_ID = uid;
                        userCount++;
                        admin.firestore().collection("accounts").doc(user_ID).collection('bank_account').get().then((childsnap) => {
                            if (childsnap.docs.length) {
                                childsnap.docs.forEach(async (bank, _bankCount) => {
                                    const account_token = bank.data().accounts_tokens;
                                    const bank_Type = bank.data().type;
                                    if (account_token && bank.data().hasPermission === true) {
                                        var today = new Date();
                                        var recurrTillDate = today.setDate(today.getDate() - 7);
                                        var startDate = new Date().toISOString().substring(0, 10);
                                        var endDate = new Date(recurrTillDate).toISOString().substring(0, 10);
                                        const request = {
                                            access_token: account_token,
                                            start_date: startDate,
                                            end_date: endDate
                                        };
                                        // Ray-Changes
                                        //client.getTransactions(account_token, endDate, startDate, {
                                        client.transactionsGet(account_token, endDate, startDate, {
                                        }, async (err, result) => {
                                            if (!err) {
                                                let resultTransactions = result.transactions;
                                                if (resultTransactions.length) {
                                                    var promises = [];
                                                    const transRef = db.collection("user_plaid_transaction").doc(user_ID).collection("transactions");
                                                    const incomeRef = db.collection("income_source").doc(user_ID).collection("incomes");
                                                    const usrtransRef = db.collection("user_transaction").doc(user_ID).collection("transactions");
                                                    const goalRef = db.collection('users').doc(user_ID).collection('goals');
                                                    const existing_ac_transaction = resultTransactions.filter(x => x.account_id === bank.id);
                                                    transRef.where("account_id", "==", bank.id).get().then((snapShots) => {
                                                        var counter = 0;
                                                        if (snapShots.docs.length) {
                                                            var DBTransaction = [];
                                                            snapShots.docs.forEach((Ele, eleIndex) => {
                                                                DBTransaction.push(Object.assign({ id: Ele.id }, Ele.data()));
                                                                if (eleIndex === snapShots.docs.length) {
                                                                    var notInDBTransaction = []; var existsInDBTransaction = [];
                                                                    existing_ac_transaction.forEach((v, i) => {
                                                                        DBTransaction.forEach((t, _index) => {
                                                                            console.log(t.account_id != v.account_id, t.amount != v.amount, t.name != v.name, t.date != v.date, t.category_id != v.category_id, t.transaction_type != v.transaction_type)
                                                                            if ((t.account_id != v.account_id && t.amount != v.amount && t.name != v.name && t.date != v.date && t.category_id != v.category_id && t.transaction_type != v.transaction_type)) {
                                                                                notInDBTransaction.push(t);
                                                                                promises.push(transRef.doc(trans.transaction_id).set(Object.assign({ "active_transaction": true, "bank_Type": bank_Type }, trans), { merge: true }));
                                                                            }
                                                                            else {
                                                                                v.transaction_id = t.transaction_id;
                                                                                v['remainingAmount'] = t.remainingAmount;
                                                                                if (_index == (res2.length - 1)) {
                                                                                    existsInDBTransaction.push(v);
                                                                                    let amountleft = v.remainingAmount ? v.amount - transa.amount : v.amount;
                                                                                    transRef.doc(v.transaction_id).update({
                                                                                        amount: v.amount,
                                                                                        remainingAmount: amountleft
                                                                                    });
                                                                                }
                                                                            }

                                                                            if (_index == (res2.length - 1) && (i == (res.length - 1))) {
                                                                                const transactions = notInDBTransaction;
                                                                                if (transactions.length) {
                                                                                    onCreateAssign(transactions[counter], bank_Type)
                                                                                }
                                                                                else {
                                                                                    if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                        runnallQueriesParallel(userpromises[userCount])
                                                                                    }
                                                                                }
                                                                            }
                                                                        });
                                                                    })
                                                                }
                                                            })
                                                        }
                                                        else {
                                                            const transactions = existing_ac_transaction;
                                                            if (transactions.length) {
                                                                onCreateAssign(transactions[counter], bank_Type)
                                                            }
                                                            else {
                                                                if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                    runnallQueriesParallel(userpromises[userCount])
                                                                }
                                                            }
                                                        }
                                                        function onCreateAssign(trans, bankType) {
                                                            counter++;
                                                            if (trans) {
                                                                const remainingAmount = trans.remainingAmount != undefined ? trans.remainingAmount : trans.amount;
                                                                if (remainingAmount < 0 && bankType === "credit") {

                                                                    if (counter < transactions.length) {
                                                                        onCreateAssign(transactions[counter], bank_Type);
                                                                    }
                                                                    else {
                                                                        if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                            runnallQueriesParallel(userpromises[userCount])
                                                                        }
                                                                    }
                                                                }
                                                                else {
                                                                    incomeRef.get().then((incomeSnap) => {
                                                                        if (incomeSnap.docs.length) {
                                                                            var iCount = 0;
                                                                            var paycheckArray = [];
                                                                            var Mostrecent = [];
                                                                            incomeSnap.docs.forEach(incomeELe => {
                                                                                incomeRef.doc(incomeELe.id).collection("paychecks").get().then((paycheckSnap) => {
                                                                                    iCount++;
                                                                                    paycheckSnap.docs.forEach((paycheckEle, _indexP) => {
                                                                                        const incomeSourceData = incomeELe.data()
                                                                                        paycheckArray.push(Object.assign({ "income_id": incomeELe.id }, { "income_name": incomeELe.data().name },
                                                                                            { "income_isRepeating": incomeELe.data().isRepeating }, { "income_budgetTemplate": incomeELe.data().budgetTemplate },
                                                                                            { "id": paycheckEle.id }, paycheckEle.data()));
                                                                                        if (iCount === incomeSnap.docs.length && (paycheckSnap.docs.length - 1 === _indexP)) {
                                                                                            paycheckArray.filter(o => {
                                                                                                if (o.payDateTimeStamp <= (new Date().getTime()) && (o.payDateTimeStamp <= (new Date(trans.date).getTime()))) {
                                                                                                    Mostrecent.push(o);
                                                                                                    Mostrecent = Mostrecent.sort(function (a, b) { return b.payDateTimeStamp - a.payDateTimeStamp })
                                                                                                    return;
                                                                                                }
                                                                                            });
                                                                                            if (Mostrecent.length) {
                                                                                                trans.category = trans.category ? trans.category : ["miscellaneous"];
                                                                                                let category;
                                                                                                for (var i = 0; i < trans.category.length; i++) {
                                                                                                    category = i == 0 ? trans.category[i] : category + "-" + trans.category[i];
                                                                                                }
                                                                                                const categoryName = category;
                                                                                                var d = Object.assign({ "remainingAmount": remainingAmount }, { "categoryName": categoryName }, trans);
                                                                                                usrtransRef.add({
                                                                                                    "name": trans.name,
                                                                                                    "category": categoryName,
                                                                                                    "category_id": trans.category_id,
                                                                                                    "transactionDateTime": trans.date ? new Date(trans.date) : new Date(),
                                                                                                    "transactionDateTimeStamp": trans.date ? new Date(trans.date).getTime() : new Date().getTime(),
                                                                                                    "amount": remainingAmount,
                                                                                                    "assignment": [{ amount: remainingAmount, paycheckId: Mostrecent[0].id }],
                                                                                                    "plaidTransId": trans.transaction_id,
                                                                                                    "type": (remainingAmount < 0) ? "income" : "expense"
                                                                                                }).then(function (transResult) {
                                                                                                    transRef.doc(trans.transaction_id).update({
                                                                                                        remainingAmount: 0,
                                                                                                        status: "Completed",
                                                                                                        assignment: [Mostrecent[0].id]
                                                                                                    }).then(() => {
                                                                                                        assignplaidTransaction({ "transaction": d, "paycheck": Mostrecent[0] }, transResult.id);
                                                                                                    }).catch(err => {
                                                                                                        console.log("errrrrr", err);
                                                                                                    });
                                                                                                    function assignplaidTransaction(params, usrTrnsId) {
                                                                                                        const addedTransactionId = usrTrnsId;
                                                                                                        // let incomeRef = db.collection("income_source").doc(userId).collection("incomes");
                                                                                                        var remainAmount = params.transaction.remainingAmount;
                                                                                                        //--------------------------income----------------------------
                                                                                                        if (params.transaction.remainingAmount < 0) {
                                                                                                            const incomeSourceId = params.paycheck.income_id;
                                                                                                            let paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(params.paycheck.id);
                                                                                                            var paycheckData = params.paycheck;
                                                                                                            var totalReceived = paycheckData.totalReceived === 0 ? Math.abs(remainAmount) : paycheckData.totalReceived + Math.abs(remainAmount)
                                                                                                            var totalspentAmount = paycheckData.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                                                                return a + b;
                                                                                                            }, 0);
                                                                                                            var totalBudgetAmount = paycheckData.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                                                                return a + b;
                                                                                                            }, 0);
                                                                                                            var totalsurplusAmount = paycheckData.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                                                                return a + b;
                                                                                                            }, 0);
                                                                                                            paycheckGet.update({
                                                                                                                totalReceived: admin.firestore.FieldValue.increment(Math.abs(remainAmount)),
                                                                                                                receivedPaycheckTransaction: admin.firestore.FieldValue.arrayUnion(usrTrnsId),
                                                                                                                budgetsAvailable: Math.abs(totalReceived) - totalspentAmount + totalsurplusAmount,
                                                                                                                budgetsToBeBudgeted: Math.abs(totalReceived) - totalBudgetAmount + totalsurplusAmount,
                                                                                                                budgetsCurrent: totalBudgetAmount,
                                                                                                                isOverbudget: (Math.abs(totalReceived) - totalBudgetAmount + totalsurplusAmount) < 0 ? true : false,
                                                                                                                isOverspent: (Math.abs(totalReceived) - totalspentAmount + totalsurplusAmount) < 0 ? true : false
                                                                                                            }).then(() => {
                                                                                                                let recentPaycheck = [];
                                                                                                                incomeRef.doc(incomeSourceId).collection("paychecks").get().then((query) => {
                                                                                                                    query.docs.filter(o => {
                                                                                                                        if (o.data().payDateTimeStamp > paycheckData.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                                                                                            recentPaycheck.push(Object.assign({ id: o.id }, o.data()));
                                                                                                                            recentPaycheck = recentPaycheck.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                                                                                            return;
                                                                                                                        }
                                                                                                                    });
                                                                                                                    if (recentPaycheck.length) {
                                                                                                                        var surplusBudgetTemplate = [];
                                                                                                                        surplusBudgetTemplate = recentPaycheck[0].surplusBudgetTemplate;
                                                                                                                        var recentReceived = Math.abs(recentPaycheck[0].totalReceived === 0 ? recentPaycheck[0].totalExpected : recentPaycheck[0].totalReceived);
                                                                                                                        var recentspentAmount = recentPaycheck[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                                                                            return a + b;
                                                                                                                        }, 0);
                                                                                                                        var recentbudgetedAmount = recentPaycheck[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                                                                            return a + b;
                                                                                                                        }, 0);
                                                                                                                        var recentsurplusAmount = surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                                                                            return a + b;
                                                                                                                        }, 0);
                                                                                                                        incomeRef.doc(incomeSourceId).collection("paychecks").doc(recentPaycheck[0].id).update({
                                                                                                                            "surplusBudgetTemplate": surplusBudgetTemplate,
                                                                                                                            "budgetsCurrent": recentbudgetedAmount,
                                                                                                                            "budgetsToBeBudgeted": recentReceived - recentbudgetedAmount + recentsurplusAmount,
                                                                                                                            "isOverbudget": (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                                                                                            "budgetsAvailable": recentReceived - recentspentAmount + recentsurplusAmount,
                                                                                                                            "isOverspent": (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                                                                                        }).then(() => {
                                                                                                                            if (counter < transactions.length) {
                                                                                                                                onCreateAssign(transactions[counter], bank_Type);
                                                                                                                            }
                                                                                                                            else {
                                                                                                                                if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                                                                    runnallQueriesParallel(userpromises[userCount])
                                                                                                                                }
                                                                                                                            }
                                                                                                                        }).catch(() => {
                                                                                                                            if (counter < transactions.length) {
                                                                                                                                onCreateAssign(transactions[counter], bank_Type);
                                                                                                                            }
                                                                                                                            else {
                                                                                                                                if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                                                                    runnallQueriesParallel(userpromises[userCount])
                                                                                                                                }
                                                                                                                            }
                                                                                                                        });
                                                                                                                    }
                                                                                                                    else {
                                                                                                                        if (counter < transactions.length) {
                                                                                                                            onCreateAssign(transactions[counter], bank_Type);
                                                                                                                        }
                                                                                                                        else {
                                                                                                                            if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                                                                runnallQueriesParallel(userpromises[userCount])
                                                                                                                            }
                                                                                                                        }
                                                                                                                    }
                                                                                                                }).catch((error) => {
                                                                                                                    if (counter < transactions.length) {
                                                                                                                        onCreateAssign(transactions[counter], bank_Type);
                                                                                                                    }
                                                                                                                    else {
                                                                                                                        if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                                                            runnallQueriesParallel(userpromises[userCount])
                                                                                                                        }
                                                                                                                    }
                                                                                                                })

                                                                                                            }).catch((error) => {
                                                                                                                if (counter < transactions.length) {
                                                                                                                    onCreateAssign(transactions[counter], bank_Type);
                                                                                                                }
                                                                                                                else {
                                                                                                                    if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                                                        runnallQueriesParallel(userpromises[userCount])
                                                                                                                    }
                                                                                                                }
                                                                                                            })
                                                                                                        }
                                                                                                        //-----------------Expense---------------------
                                                                                                        else {
                                                                                                            const incomeSourceId = params.paycheck.income_id;
                                                                                                            let paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(params.paycheck.id);
                                                                                                            var paycheckData = params.paycheck;
                                                                                                            var existingBudgetDetails = paycheckData.budgetDetails;
                                                                                                            let index = existingBudgetDetails.findIndex(o => o.category === params.transaction.categoryName);
                                                                                                            if (index != -1) {
                                                                                                                existingBudgetDetails[index].spent = existingBudgetDetails[index].spent + Math.abs(remainAmount);
                                                                                                                existingBudgetDetails[index].available = existingBudgetDetails[index].available - Math.abs(remainAmount);
                                                                                                                if (existingBudgetDetails[index].transactions && existingBudgetDetails[index].transactions.length) {
                                                                                                                    existingBudgetDetails[index].transactions.push(addedTransactionId);
                                                                                                                }
                                                                                                                else {
                                                                                                                    existingBudgetDetails[index].transactions = [addedTransactionId]
                                                                                                                }
                                                                                                            }
                                                                                                            else {
                                                                                                                existingBudgetDetails.push({
                                                                                                                    "category": params.transaction.categoryName,
                                                                                                                    "category_id": params.transaction.category_id,
                                                                                                                    "budgeted": 0,
                                                                                                                    "spent": remainAmount,
                                                                                                                    "available": -remainAmount,
                                                                                                                    "transactions": [addedTransactionId]
                                                                                                                })
                                                                                                            }
                                                                                                            var totalReceived = paycheckData.totalReceived === 0 ? paycheckData.totalExpected : paycheckData.totalReceived;
                                                                                                            var totalspentAmount = existingBudgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                                                                return a + b;
                                                                                                            }, 0);
                                                                                                            var totalbudgetedAmount = existingBudgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                                                                return a + b;
                                                                                                            }, 0);
                                                                                                            var totalsurplusAmount = paycheckData.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                                                                return a + b;
                                                                                                            }, 0);
                                                                                                            paycheckGet.update({
                                                                                                                budgetDetails: existingBudgetDetails,
                                                                                                                budgetsCurrent: totalbudgetedAmount,
                                                                                                                budgetsToBeBudgeted: totalReceived - totalbudgetedAmount + totalsurplusAmount,
                                                                                                                isOverbudget: (totalReceived - totalbudgetedAmount + totalsurplusAmount) < 0 ? true : false,
                                                                                                                budgetsAvailable: totalReceived - totalspentAmount + totalsurplusAmount,
                                                                                                                isOverspent: paycheckData.budgetsAvailable - remainAmount < 0 ? true : false
                                                                                                            }).then(() => {
                                                                                                                let recentPaycheck = [];
                                                                                                                incomeRef.doc(incomeSourceId).collection("paychecks").get().then((query) => {
                                                                                                                    query.docs.filter(o => {
                                                                                                                        if (o.data().payDateTimeStamp > paycheckData.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                                                                                            recentPaycheck.push(Object.assign({ id: o.id }, o.data()));
                                                                                                                            recentPaycheck = recentPaycheck.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                                                                                            return;
                                                                                                                        }
                                                                                                                    });
                                                                                                                    if (recentPaycheck.length) {
                                                                                                                        let indx = recentPaycheck[0].budgetDetails.findIndex(o => o.category == params.transaction.categoryName);
                                                                                                                        if (indx != -1) {
                                                                                                                            recentPaycheck[0].budgetDetails[indx].available = (recentPaycheck[0].budgetDetails[indx].available + (-Math.abs(remainAmount)));
                                                                                                                            recentPaycheck[0].budgetDetails[indx].budgeted = recentPaycheck[0].budgetDetails[indx].budgeted + (-Math.abs(remainAmount));
                                                                                                                        }
                                                                                                                        else {
                                                                                                                            recentPaycheck[0].budgetDetails.push({
                                                                                                                                "category": params.transaction.categoryName,
                                                                                                                                "category_id": params.transaction.category_id,
                                                                                                                                "budgeted": (-Math.abs(remainAmount)),
                                                                                                                                "spent": 0,
                                                                                                                                "available": (-Math.abs(remainAmount)),
                                                                                                                                "transactions": []
                                                                                                                            })
                                                                                                                        }
                                                                                                                        let _rindex = recentPaycheck[0].rolloverBudgetTemplate.findIndex(o => o.category === params.transaction.categoryName);
                                                                                                                        if (_rindex != -1) {
                                                                                                                            recentPaycheck[0].rolloverBudgetTemplate[_rindex].budgeted = recentPaycheck[0].rolloverBudgetTemplate[_rindex].budgeted + (-Math.abs(remainAmount));
                                                                                                                            recentPaycheck[0].rolloverBudgetTemplate[_rindex].available = recentPaycheck[0].rolloverBudgetTemplate[_rindex].available + (-Math.abs(remainAmount));
                                                                                                                        }
                                                                                                                        else {
                                                                                                                            recentPaycheck[0].rolloverBudgetTemplate.push({
                                                                                                                                "category": params.transaction.categoryName,
                                                                                                                                "category_id": params.transaction.category_id,
                                                                                                                                "budgeted": (-Math.abs(remainAmount)),
                                                                                                                                "spent": 0,
                                                                                                                                "available": (-Math.abs(remainAmount)),
                                                                                                                                "transactions": []
                                                                                                                            });
                                                                                                                        }
                                                                                                                        var recentReceived = recentPaycheck[0].totalReceived === 0 ? recentPaycheck[0].totalExpected : recentPaycheck[0].totalReceived;
                                                                                                                        var recentspentAmount = recentPaycheck[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                                                                            return a + b;
                                                                                                                        }, 0);
                                                                                                                        var recentsurplusAmount = recentPaycheck[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                                                                            return a + b;
                                                                                                                        }, 0);
                                                                                                                        var recentbudgetedAmount = recentPaycheck[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                                                                            return a + b;
                                                                                                                        }, 0);
                                                                                                                        incomeRef.doc(incomeSourceId).collection("paychecks").doc(recentPaycheck[0].id).update({
                                                                                                                            budgetDetails: recentPaycheck[0].budgetDetails,
                                                                                                                            budgetsToBeBudgeted: recentReceived - recentbudgetedAmount + recentsurplusAmount,
                                                                                                                            budgetsCurrent: recentbudgetedAmount,
                                                                                                                            rolloverBudgetTemplate: recentPaycheck[0].rolloverBudgetTemplate,
                                                                                                                            surplusBudgetTemplate: recentPaycheck[0].surplusBudgetTemplate,
                                                                                                                            budgetsAvailable: recentReceived - recentspentAmount + recentsurplusAmount,
                                                                                                                            isOverbudget: (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                                                                                            isOverspent: (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                                                                                        }).then(() => {
                                                                                                                            updateGoals(remainAmount, params.transaction.category_id);

                                                                                                                        }).catch((e) => {
                                                                                                                            if (counter != transactions.length && counter < transactions.length) {
                                                                                                                                onCreateAssign(transactions[counter], bank_Type);
                                                                                                                            } else {
                                                                                                                                console.log("Err0r From PLaid", JSON.stringify(err))
                                                                                                                                if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                                                                    runnallQueriesParallel(userpromises[userCount])
                                                                                                                                }
                                                                                                                            }
                                                                                                                        });
                                                                                                                    }
                                                                                                                    else {
                                                                                                                        updateGoals(remainAmount, params.transaction.category_id);
                                                                                                                    }
                                                                                                                    function updateGoals(amount, category_id) {
                                                                                                                        goalRef.where("goal_incomeSource_Id", "==", incomeSourceId).get().then((snap) => {
                                                                                                                            if (snap.docs.length) {
                                                                                                                                snap.docs.forEach((goal, indexA) => {
                                                                                                                                    if (goal.data().category_id === category_id) {
                                                                                                                                        var goalData = goal.data();
                                                                                                                                        if (goalData.goal_type === "saving") {
                                                                                                                                            goalData.left_amount = goalData.left_amount - Math.abs(amount);
                                                                                                                                            goalData.paid_amount = goalData.paid_amount + Math.abs(amount);
                                                                                                                                            goalData.isAccomplished = (goalData.paid_amount >= goalData.goal_amount) ? true : false;
                                                                                                                                            if (goalData.paid_amount >= goalData.goal_amount) {
                                                                                                                                                goalData.left_amount = 0;
                                                                                                                                            }
                                                                                                                                            calculateDate(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                                                                                                                goalData.goal_endDate = date;
                                                                                                                                                goalRef.doc(goal.id).update({
                                                                                                                                                    left_amount: goalData.left_amount,
                                                                                                                                                    paid_amount: goalData.paid_amount,
                                                                                                                                                    goal_endDate: goalData.goal_endDate,
                                                                                                                                                    isAccomplished: goalData.isAccomplished
                                                                                                                                                });
                                                                                                                                            });
                                                                                                                                        }
                                                                                                                                        else {
                                                                                                                                            goalData.left_amount = goalData.left_amount - Math.abs(amount);
                                                                                                                                            goalData.paid_amount = goalData.paid_amount + Math.abs(amount);
                                                                                                                                            goalData.isAccomplished = (goalData.left_amount <= 0) ? true : false;
                                                                                                                                            if (goalData.paid_amount >= goalData.goal_amount) {
                                                                                                                                                goalData.left_amount = 0;
                                                                                                                                            }
                                                                                                                                            calculateTarget(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                                                                                                                goalData.goal_endDate = date;
                                                                                                                                                goalRef.doc(goal.id).update({
                                                                                                                                                    left_amount: goalData.left_amount,
                                                                                                                                                    paid_amount: goalData.paid_amount,
                                                                                                                                                    goal_endDate: goalData.goal_endDate,
                                                                                                                                                    isAccomplished: goalData.isAccomplished
                                                                                                                                                });
                                                                                                                                            });
                                                                                                                                        }

                                                                                                                                    }
                                                                                                                                    if (snap.docs.length - 1 === indexA) {
                                                                                                                                        if (counter != transactions.length && counter < transactions.length) {
                                                                                                                                            onCreateAssign(transactions[counter], bank_Type);
                                                                                                                                        }
                                                                                                                                        else {

                                                                                                                                            if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                                                                                runnallQueriesParallel(userpromises[userCount])
                                                                                                                                            }
                                                                                                                                        }
                                                                                                                                    }
                                                                                                                                });
                                                                                                                            }
                                                                                                                            else {
                                                                                                                                if (counter != transactions.length && counter < transactions.length) {
                                                                                                                                    onCreateAssign(transactions[counter], bank_Type);
                                                                                                                                }
                                                                                                                                else {

                                                                                                                                    if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                                                                        runnallQueriesParallel(userpromises[userCount])
                                                                                                                                    }
                                                                                                                                }
                                                                                                                            }
                                                                                                                        }).catch((error) => {
                                                                                                                            if (counter != transactions.length && counter < transactions.length) {
                                                                                                                                onCreateAssign(transactions[counter], bank_Type);
                                                                                                                            }
                                                                                                                            else {

                                                                                                                                if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                                                                    runnallQueriesParallel(userpromises[userCount])
                                                                                                                                }
                                                                                                                            }
                                                                                                                        });

                                                                                                                    }
                                                                                                                })
                                                                                                                    .catch((error) => {
                                                                                                                        if (counter != transactions.length && counter < transactions.length) {
                                                                                                                            onCreateAssign(transactions[counter], bank_Type);
                                                                                                                        }
                                                                                                                        else {

                                                                                                                            if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                                                                runnallQueriesParallel(userpromises[userCount])
                                                                                                                            }
                                                                                                                        }
                                                                                                                    });


                                                                                                            }).catch((error) => {
                                                                                                                if (counter != transactions.length && counter < transactions.length) {
                                                                                                                    onCreateAssign(transactions[counter], bank_Type);
                                                                                                                }
                                                                                                                else {

                                                                                                                    if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                                                        runnallQueriesParallel(userpromises[userCount])
                                                                                                                    }
                                                                                                                }
                                                                                                            })
                                                                                                        }
                                                                                                    }
                                                                                                }).catch(function (error) {
                                                                                                    if (counter != transactions.length && counter < transactions.length) {
                                                                                                        onCreateAssign(transactions[counter], bank_Type);
                                                                                                    }
                                                                                                    else {

                                                                                                        if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                                            runnallQueriesParallel(userpromises[userCount])
                                                                                                        }
                                                                                                    }
                                                                                                });
                                                                                            }
                                                                                            else {
                                                                                                if (counter != transactions.length && counter < transactions.length) {
                                                                                                    onCreateAssign(transactions[counter], bank_Type);
                                                                                                }
                                                                                                else {

                                                                                                    if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                                        runnallQueriesParallel(userpromises[userCount])
                                                                                                    }
                                                                                                }
                                                                                            }
                                                                                        }
                                                                                    });
                                                                                }).catch(err => {
                                                                                    if (counter != transactions.length && counter < transactions.length) {
                                                                                        onCreateAssign(transactions[counter], bank_Type);
                                                                                    }
                                                                                    else {

                                                                                        if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                            runnallQueriesParallel(userpromises[userCount])
                                                                                        }
                                                                                    }
                                                                                })

                                                                            })
                                                                        }
                                                                        else {
                                                                            if (counter != transactions.length && counter < transactions.length) {
                                                                                onCreateAssign(transactions[counter], bank_Type);
                                                                            }
                                                                            else {

                                                                                if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                    runnallQueriesParallel(userpromises[userCount])
                                                                                }
                                                                            }
                                                                        }
                                                                    }).catch(err => {
                                                                        if (counter != transactions.length && counter < transactions.length) {
                                                                            onCreateAssign(transactions[counter], bank_Type);
                                                                        }
                                                                        else {

                                                                            if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                                                runnallQueriesParallel(userpromises[userCount])
                                                                            }
                                                                        }
                                                                    })
                                                                }
                                                            }

                                                        }
                                                    }).catch(() => {
                                                        if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                            runnallQueriesParallel(userpromises[userCount])
                                                        }
                                                    })
                                                }
                                            } else if (err) {
                                                console.log("Error In Plaid", JSON.stringify(err))
                                                if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                                    runnallQueriesParallel(userpromises[userCount])
                                                }
                                            }
                                        })
                                    }
                                    else {
                                        console.log("No permisssion for fetching the transactions")
                                        if (_bankCount === (childsnap.docs.length - 1) && userCount < totalUserCount) {
                                            runnallQueriesParallel(userpromises[userCount])
                                        }
                                    }
                                })

                            }
                            else {
                                if (userCount < totalUserCount) {
                                    runnallQueriesParallel(userpromises[userCount])
                                }
                            }
                        }).catch(err => {
                            if (userCount < totalUserCount) {
                                runnallQueriesParallel(userpromises[userCount])
                            }
                            console.log(err);
                        })
                    }
                })
        }
    }).catch(err => {
        console.log("err", err)
    });
    return null;
});

exports.dailyGoalTrack = functions.pubsub.schedule("every 8 hours").onRun(context => {
    var promises = [];
    admin.firestore().collection('users').get().then(function (user) {
        user.docs.map(o => promises.push({ id: o.id }));
        Promise.all(promises).then((userArray) => {
            let userCount = 0;
            const userTotalCount = userArray.length;
            UpdateBalances(userArray[userCount]);
            console.log("every 8 hours changed ppto every 5 minutes userTotalCount");
            function UpdateBalances(usr) {
                userCount++;
                if (usr.id) {
                    admin.firestore().collection('users').doc(usr.id).collection('goals').get().then(
                        (goalSnapShots) => {
                            if (goalSnapShots.docs.length) {
                                var goalCounter = 0;
                                const totalGoalCount = goalSnapShots.docs.length;
                                updateGoalDetails(goalSnapShots.docs[goalCounter])
                                function updateGoalDetails(details) {
                                    goalCounter++;
                                    var today = new Date().getTime();
                                    if (details.data() && details.data().goal_incomeSource_Id) {
                                        var goalData = details.data();
                                        if (goalData.goal_type === "saving") {
                                            if (goalData.paid_amount >= goalData.goal_amount) {
                                                goalData.left_amount = 0;
                                            }
                                            calculateDate(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                goalData.goal_endDate = date;
                                                let endDateTimeStamp = new Date(goalData.goal_endDate).getTime();
                                                if (goalData.paid_amount >= goalData.goal_amount || endDateTimeStamp > today) {
                                                    goalData.isAccomplished = true
                                                }
                                            });
                                        }
                                        else {
                                            if (goalData.paid_amount >= goalData.goal_amount) {
                                                goalData.left_amount = 0;
                                            }
                                            calculateTarget(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                goalData.goal_endDate = date;
                                                let endDateTimeStamp = new Date(goalData.goal_endDate).getTime();
                                                if (goalData.paid_amount === 0 || endDateTimeStamp > today) {
                                                    goalData.isAccomplished = true
                                                }
                                            });
                                        }
                                        let goalRef = admin.firestore().collection('users').doc(usr.id).collection('goals').doc(details.id);
                                        goalRef.doc(goal.id).update({
                                            left_amount: goalData.left_amount,
                                            paid_amount: goalData.paid_amount,
                                            goal_endDate: goalData.goal_endDate,
                                            isAccomplished: goalData.isAccomplished
                                        }).then(() => {
                                            if (totalGoalCount === goalCounter) {
                                                if (userTotalCount >= userCount) {
                                                    UpdateBalances(userArray[userCount]);
                                                }
                                            } else {
                                                updateGoalDetails(goalSnapShots.docs[goalCounter])
                                            }
                                        }).catch(() => {
                                            if (totalGoalCount === goalCounter) {
                                                if (userTotalCount >= userCount) {
                                                    UpdateBalances(userArray[userCount]);
                                                }
                                            } else {
                                                updateGoalDetails(goalSnapShots.docs[goalCounter])
                                            }
                                        });
                                    }
                                    else {
                                        if (totalGoalCount === goalCounter) {
                                            if (userTotalCount >= userCount) {
                                                UpdateBalances(userArray[userCount]);
                                            }
                                        } else {
                                            updateGoalDetails(goalSnapShots.docs[goalCounter])
                                        }
                                    }
                                }
                            }
                            else {
                                if (userTotalCount >= userCount) {
                                    UpdateBalances(userArray[userCount]);
                                }
                            }
                        }
                    ).catch((err) => {
                        if (userTotalCount >= userCount) {
                            UpdateBalances(userArray[userCount]);
                        }
                    })
                }
                else {
                    if (userTotalCount >= userCount) {
                        UpdateBalances(userArray[userCount]);
                    }
                }
            }
        });
    }).catch(function (err) {
        console.log("error in users details getting: " + err)
    });
    return null;
});

//bhavna
exports.sendAutomatedEmails = functions.schedule('* * * * *').onRun(context =>{
    console.log("This will a send mail every minute");
})
exports.dailyJob = functions.pubsub.schedule('00 9 * * *').onRun(context => {
    const usersRef = admin.firestore().collection("income_source").where("active", "==", true);
    usersRef.get().then(async (snapUsers) => {
        var userpromises = [];
        if (snapUsers.docs.length) {
            snapUsers.docs.map(async (o) => userpromises.push({ id: o.id }));
            var usrCount = 0;
            if (userpromises.length) {
                const totalUserActive = userpromises.length;
                getUsersIncomeSources(userpromises[usrCount]);
                function getUsersIncomeSources(user_Id) {
                    usrCount++;
                    if (user_Id) {
                        const incomeRef = admin.firestore().collection("income_source").doc(user_Id).collection("incomes").where("isRepeating", "==", true);
                        incomeRef.get().then(async (snap) => {
                            var incomePromises = [];
                            if (snap.docs.length) {
                                snap.docs.map(async (o) => incomePromises.push({ id: o.id }));
                                let incomeCount = 0;
                                getUsersIncomeAndPaycheck(user_Id, incomePromises[incomeCount].id)
                                function getUsersIncomeAndPaycheck(uid, documentId) {
                                    const userId = uid;
                                    const incomeSourceId = documentId;
                                    const incomePaycheckRef = admin.firestore().collection("income_source").doc(userId).collection("incomes").doc(incomeSourceId);
                                    incomePaycheckRef.get().then((snapIncome) => {
                                        if (snapIncome.exists) {
                                            var incomeCheck = snapIncome.data();
                                            var today = new Date();
                                            var recurrTillDate = today.setMonth(today.getMonth() + 1);
                                            let repeatingDates = [];
                                            incomeCheck.repeating.payDays.filter(o => repeatingDates.push(o.toDate()))
                                            let lastDate;
                                            if (repeatingDates) {
                                                repeatingDates.sort((a, b) => (new Date(b).getTime()) - (new Date(a).getTime()))
                                                lastDate = repeatingDates[0];
                                            }
                                            else {
                                                lastDate = incomeCheck.repeating.payDays[incomeCheck.repeating.payDays.length - 1].toDate();
                                            }
                                            var nextDate = new Date(recurrTillDate);
                                            var diff = new DateDiff(nextDate, lastDate);
                                            let numDays = diff.days();
                                            let numMonth = diff.months();
                                            var totalPaychecksReccured = 0;
                                            var mode = incomeCheck.repeating.type;
                                            let payDate = [];
                                            if (mode == "weekly") {
                                                var c = numDays / 7;
                                                for (var i = 0; i < Math.floor(c); i++) {
                                                    payDate.push(new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + (7 * (i + 1))));
                                                }
                                                totalPaychecksReccured = payDate.length;
                                            }
                                            else if (mode == "monthly") {
                                                for (var i = 0; i < Math.floor(numMonth); i++) {
                                                    if (incomeCheck.weeks && incomeCheck.weeks != null) {
                                                        var firstWeekOfDate = getDateofWeek(new Date(lastDate.getFullYear(), lastDate.getMonth() + i + 1, lastDate.getDate()), incomeCheck.weeks.weekDays);
                                                        payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * incomeCheck.weeks.weekNumber[0]) - 7)));
                                                    } else {
                                                        payDate.push(new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, lastDate.getDate() + (7 * i)));

                                                    }
                                                    totalPaychecksReccured = payDate.length;
                                                }
                                            }
                                            else if (mode == "semimonthly") {
                                                for (var i = 0; i < Math.ceil(numMonth); i++) {
                                                    if (incomeCheck.weeks.dateFormat === 'weekly') {
                                                        var firstWeekOfDate = getDateofWeek(new Date(lastDate.getFullYear(), lastDate.getMonth() + i + 1, lastDate.getDate()), incomeCheck.weeks.weekDays);
                                                        payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * incomeCheck.weeks.weekNumber[0]) - 7)));
                                                        payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * incomeCheck.weeks.weekNumber[1]) - 7)));
                                                    }
                                                    else if (incomeCheck.weeks.dateFormat === 'Date') {
                                                        var currentDate = new Date(new Date(new Date(new Date().setFullYear(lastDate.getFullYear())).setMonth(lastDate.getMonth() + i + 1)).setDate(lastDate.getDate()));
                                                        payDate.push(new Date(currentDate.setDate(incomeCheck.weeks.monthDays[0])));
                                                        payDate.push(new Date(currentDate.setDate(incomeCheck.weeks.monthDays[1])));
                                                    }
                                                    totalPaychecksReccured = payDate.length;
                                                }

                                            }
                                            else if (mode == "biweekly") {
                                                var c = numDays / 14;
                                                for (var i = 0; i < Math.floor(c); i++) {
                                                    payDate.push(new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + (14 * (i + 1))));
                                                    totalPaychecksReccured = payDate.length;
                                                }
                                            }
                                            var template = [];
                                            if (incomeCheck.budgetTemplate.budgetTemplateDetails.length) {
                                                incomeCheck.budgetTemplate.budgetTemplateDetails.forEach(function (i) {
                                                    template.push({
                                                        "category": i.category,
                                                        "category_id": i.category_id,
                                                        "budgeted": i.budgeted,
                                                        "spent": 0,
                                                        "available": i.budgeted,
                                                        "transactions": [],
                                                        "goalId": i.goalId ? i.goalId : []
                                                    })
                                                });
                                            }
                                            var surplusBudgetTemplate = [];
                                            if (payDate.length) {
                                                payDate = payDate.filter((v, i, a) => a.findIndex(t => (new Date(t.toLocaleDateString()).getTime() === new Date(v.toLocaleDateString()).getTime())) === i)
                                                addPayChecks(0)
                                            }
                                            else {
                                                incomeCount++;
                                                if (incomeCount >= incomePromises.length) {
                                                    if (usrCount < totalUserActive) {
                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                    }
                                                }
                                                else {
                                                    getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                }
                                            }
                                            // adding new paycheck to income source.
                                            function addPayChecks(key) {
                                                if (key < payDate.length) {
                                                    incomePaycheckRef.collection("paychecks").get().then((snapDocs) => {
                                                        var paychecksArray = [];
                                                        var add_incomes = [];
                                                        let totalAddIncome = 0;
                                                        if (snapDocs.docs.length) {
                                                            snapDocs.docs.filter(o => paychecksArray.push(Object.assign({ id: o.id }, o.data())));
                                                            paychecksArray = paychecksArray.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp);
                                                            var totaltemplateSurplus = surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                return a + b;
                                                            }, 0);
                                                            var totalBudgetAmount = template.map(o => o.budgeted).reduce(function (a, b) {
                                                                return a + b;
                                                            }, 0);
                                                            var totaltmplspentAmount = template.map(o => o.spent).reduce(function (a, b) {
                                                                return a + b;
                                                            }, 0);
                                                            if (paychecksArray.length) {
                                                                incomePaycheckRef.collection("paychecks").add({
                                                                    "name": `${new Date(payDate[key]).toLocaleDateString()} Paycheck`,
                                                                    "payDate": new Date(payDate[key]),
                                                                    'add_incomes': add_incomes.length ? add_incomes : [],
                                                                    "payDateTimeStamp": new Date(payDate[key]).getTime(),
                                                                    "totalExpected": incomeCheck.budgetTemplate.totalExpected + totalAddIncome,
                                                                    "totalReceived": 0,
                                                                    "surplusBudgetTemplate": key == 0 ? surplusBudgetTemplate : [],
                                                                    "receivedPaycheckTransaction": [],
                                                                    "budgetsAvailable": (incomeCheck.budgetTemplate.totalExpected - totaltmplspentAmount + totaltemplateSurplus + totalAddIncome),
                                                                    "budgetsCurrent": totalBudgetAmount,
                                                                    "budgetsToBeBudgeted": (incomeCheck.budgetTemplate.totalExpected - totalBudgetAmount + totaltemplateSurplus + totalAddIncome),
                                                                    "isOverbudget": (incomeCheck.budgetTemplate.totalExpected - totalBudgetAmount + totaltemplateSurplus + totalAddIncome) < 0 ? true : false,
                                                                    "isOverspent": (incomeCheck.budgetTemplate.totalExpected - totaltmplspentAmount + totaltemplateSurplus + totalAddIncome) < 0 ? true : false,
                                                                    "budgetDetails": template,
                                                                    "rolloverBudgetTemplate": []
                                                                }).then((addSnap) => {
                                                                    incomeCheck.repeating.payDays.push(payDate[key]);
                                                                    incomeCheck.paycheckIds.push(addSnap.id);
                                                                    incomePaycheckRef.update({
                                                                        paycheckIds: incomeCheck.paycheckIds,
                                                                        mergedIncome: incomeCheck.mergedIncome,
                                                                        ['repeating.payDays']: incomeCheck.repeating.payDays,
                                                                    }).then(() => {
                                                                        console.log("paydate added level 2", JSON.stringify(payDate[key]))
                                                                        key++;
                                                                        if (key < payDate.length) {
                                                                            addPayChecks(key);
                                                                        }
                                                                        else {

                                                                            addExtraIncome(payDate)
                                                                        }
                                                                    }).catch((error) => {
                                                                        console.log(error);
                                                                        key++;
                                                                        if (key < payDate.length) {
                                                                            addPayChecks(key);
                                                                        }
                                                                        else {

                                                                            addExtraIncome(payDate)
                                                                        }
                                                                    });

                                                                }).catch((error) => {
                                                                    console.log(error);
                                                                    key++;
                                                                    if (key < payDate.length) {
                                                                        addPayChecks(key);
                                                                    }
                                                                    else {

                                                                        addExtraIncome(payDate)
                                                                    }
                                                                });
                                                            }
                                                            else {
                                                                incomePaycheckRef.collection("paychecks").add({
                                                                    "name": `${new Date(payDate[key]).toLocaleDateString()} Paycheck`,
                                                                    "payDate": new Date(payDate[key]),
                                                                    "payDateTimeStamp": new Date(payDate[key]).getTime(),
                                                                    "totalExpected": incomeCheck.budgetTemplate.totalExpected,
                                                                    "totalReceived": 0,
                                                                    'add_incomes': [],
                                                                    "surplusBudgetTemplate": key == 0 ? surplusBudgetTemplate : [],
                                                                    "receivedPaycheckTransaction": [],
                                                                    "budgetsAvailable": (incomeCheck.budgetTemplate.totalExpected - totaltmplspentAmount + totaltemplateSurplus),
                                                                    "budgetsCurrent": totalBudgetAmount,
                                                                    "budgetsToBeBudgeted": (incomeCheck.budgetTemplate.totalExpected - totalBudgetAmount + totaltemplateSurplus),
                                                                    "isOverbudget": (incomeCheck.budgetTemplate.totalExpected - totalBudgetAmount + totaltemplateSurplus) < 0 ? true : false,
                                                                    "isOverspent": (incomeCheck.budgetTemplate.totalExpected - totaltmplspentAmount + totaltemplateSurplus) < 0 ? true : false,
                                                                    "budgetDetails": template,
                                                                    "rolloverBudgetTemplate": []
                                                                }).then((addSnap) => {
                                                                    incomeCheck.repeating.payDays.push(payDate[key]);
                                                                    incomeCheck.paycheckIds.push(addSnap.id);
                                                                    incomePaycheckRef.update({
                                                                        paycheckIds: incomeCheck.paycheckIds,
                                                                        ['repeating.payDays']: incomeCheck.repeating.payDays,
                                                                    }).then(() => {
                                                                        console.log("paydate added level 1", JSON.stringify(payDate[key]))
                                                                        key++;
                                                                        if (key < payDate.length) {
                                                                            addPayChecks(key);
                                                                        }
                                                                        else {

                                                                            addExtraIncome(payDate)
                                                                        }
                                                                    }).catch((error) => {
                                                                        console.log(error);
                                                                        key++;
                                                                        if (key < payDate.length) {
                                                                            addPayChecks(key);
                                                                        }
                                                                        else {

                                                                            addExtraIncome(payDate)
                                                                        }
                                                                    });
                                                                }).catch((error) => {
                                                                    console.log(error);
                                                                    key++;
                                                                    if (key < payDate.length) {
                                                                        addPayChecks(key);
                                                                    }
                                                                    else {

                                                                        addExtraIncome(payDate)
                                                                    }
                                                                });
                                                            }
                                                        }
                                                        else {
                                                            key++;
                                                            if (key < payDate.length) {
                                                                addPayChecks(key);
                                                            }
                                                            else {

                                                                addExtraIncome(payDate)
                                                            }
                                                        }
                                                    }).catch((error) => {
                                                        console.log(error);
                                                        key++;
                                                        if (key < payDate.length) {
                                                            addPayChecks(key);
                                                        }
                                                        else {
                                                            addExtraIncome(payDate)
                                                        }

                                                    });
                                                }
                                                else {
                                                    addExtraIncome(payDate)
                                                }
                                            }
                                            // adding extra incomesources which is merged previously.
                                            function addExtraIncome(newPayDates) {
                                                if (incomeCheck.mergedIncome && incomeCheck.mergedIncome.length) {
                                                    console.log("income merge length", incomeCheck.mergedIncome.length)
                                                    var _mergeIndex = 0;
                                                    assignmerge(incomeCheck.mergedIncome[_mergeIndex])
                                                    function assignmerge(merge) {
                                                        _mergeIndex++;
                                                        if (merge.payDates && merge.payDates.length) {
                                                            let lastAssigned = (merge.payDates.sort((a, b) => (b.toDate()).getTime() - (a.toDate()).getTime())[0]).toDate();
                                                            var nextDate = new Date(recurrTillDate);
                                                            var diff = new DateDiff(nextDate, lastAssigned);
                                                            let numDays = diff.days();
                                                            let numMonth = diff.months();
                                                            var totalPaychecksReccured = 0;
                                                            var mode1 = merge.repeatingType;
                                                            const dayDifferance = merge.dayDifference;
                                                            const modeDaysDiff = getDayDiifer(incomeCheck.repeating.type);
                                                            let addpayDate = [];
                                                            if (mode1 == "weekly") {
                                                                var c = numDays / 7;
                                                                for (var i = 0; i < Math.floor(c); i++) {
                                                                    addpayDate.push(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth(), lastAssigned.getDate() + (7 * (i + 1))));
                                                                }
                                                                totalPaychecksReccured = addpayDate.length;
                                                            }
                                                            else if (mode1 == "monthly") {
                                                                var c = numMonth;
                                                                for (var i = 0; i < Math.floor(c); i++) {
                                                                    addpayDate.push(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth() + 1, lastAssigned.getDate() + (7 * i)));
                                                                    totalPaychecksReccured = addpayDate.length;
                                                                }
                                                            }
                                                            else if (mode1 == "semimonthly") {
                                                                for (var i = 0; i < Math.ceil(numMonth); i++) {
                                                                    if (merge.weeks && merge.weeks.dateFormat === 'weekly') {
                                                                        var firstWeekOfDate = getDateofWeek(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth() + i + 1, lastAssigned.getDate()), merge.weeks.weekDays);
                                                                        addpayDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * merge.weeks.weekNumber[0]) - 7)));
                                                                        addpayDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * merge.weeks.weekNumber[1]) - 7)));
                                                                    }
                                                                    else if (merge.weeks && merge.weeks.dateFormat === 'Date') {
                                                                        var currentDate = new Date(new Date(new Date(new Date().setFullYear(lastDate.getFullYear())).setMonth(lastDate.getMonth() + i + 1)).setDate(lastDate.getDate()));
                                                                        addpayDate.push(new Date(currentDate.setDate(merge.weeks.monthDays[0])));
                                                                        addpayDate.push(new Date(currentDate.setDate(merge.weeks.monthDays[1])));
                                                                    }
                                                                    totalPaychecksReccured = addpayDate.length;
                                                                }

                                                            }
                                                            else if (mode1 == "biweekly") {
                                                                var c = numDays / 14;
                                                                for (var i = 0; i < Math.floor(c); i++) {
                                                                    addpayDate.push(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth(), lastAssigned.getDate() + (14 * (i + 1))));
                                                                    totalPaychecksReccured = addpayDate.length;
                                                                }
                                                            }
                                                            if (addpayDate.length) {
                                                                console.log("add pay  length", addpayDate.length)
                                                                addpayDate.forEach((payDay) => {
                                                                    let nearestPayDate = [];
                                                                    payDate.filter(o => {
                                                                        if (o.getTime() <= payDay.getTime()) {
                                                                            nearestPayDate.push(o)
                                                                        }
                                                                    })
                                                                    if (nearestPayDate.length) {
                                                                        console.log("nearestPayDate pay  length", nearestPayDate.length)
                                                                        nearestPayDate = nearestPayDate.sort((a, b) => b.getTime() - a.getTime())
                                                                        let diff = new DateDiff(nearestPayDate[0], payDay);
                                                                        let days = diff.days();
                                                                        if (Math.abs(days) <= dayDifferance && Math.abs(days) <= modeDaysDiff) {
                                                                            if (days === modeDaysDiff && mode === 'weekly' && (mode1 === 'biweekly' || mode1 === 'semimonthly')) {
                                                                                console.log("isnt possible right now???????")
                                                                            }
                                                                            else {
                                                                                incomePaycheckRef.collection("paychecks").where("payDate", "==", nearestPayDate[0]).get().then((paycheckUpdate) => {
                                                                                    if (paycheckUpdate.docs.length) {
                                                                                        console.log("paycheckUpdate docs length", paycheckUpdate.docs.length)
                                                                                        let documentData = paycheckUpdate.docs[0].data();
                                                                                        let docsID = paycheckUpdate.docs[0].id;
                                                                                        var add_incomes = [];
                                                                                        if (documentData.add_incomes) {
                                                                                            add_incomes = documentData.add_incomes;
                                                                                        }
                                                                                        var totalReceived = documentData.totalReceived === 0 ? documentData.totalExpected : documentData.totalReceived;
                                                                                        var totalspentAmount = documentData.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                                            return a + b;
                                                                                        }, 0);
                                                                                        var totalBudgetAmount = documentData.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                                            return a + b;
                                                                                        }, 0);
                                                                                        var budgetsAvailable = totalReceived - totalspentAmount + merge.income;
                                                                                        var budgetsToBeBudgeted = totalReceived - totalBudgetAmount + merge.income;
                                                                                        var totalExpected = documentData.totalExpected + merge.income;
                                                                                        add_incomes.push({
                                                                                            "name": merge.name,
                                                                                            "isRepeating": merge.isRepeating,
                                                                                            "repeatingType": merge.repeatingType,
                                                                                            "startDate": payDay.toLocaleDateString(),
                                                                                            "income": merge.income,
                                                                                            "dayDifference": merge.dayDifference,
                                                                                        })
                                                                                        incomePaycheckRef.collection("paychecks").doc(docsID).update({
                                                                                            budgetsAvailable: budgetsAvailable,
                                                                                            totalExpected: totalExpected,
                                                                                            budgetsToBeBudgeted: budgetsToBeBudgeted,
                                                                                            add_incomes: add_incomes
                                                                                        }).then(() => {
                                                                                            console.log("this paycheck is updated", docsID)
                                                                                            incomeCheck.mergedIncome[_mergeIndex].payDates.push(admin.firestore.Timestamp.fromDate(payDay))
                                                                                            incomePaycheckRef.update({
                                                                                                mergedIncome: incomeCheck.mergedIncome
                                                                                            }).then((res) => {
                                                                                                console.log("this income is updated", userId);
                                                                                                console.log("incomeCheck.mergedIncome", _mergeIndex, (incomeCheck.mergedIncome.length - 1))
                                                                                                if (_mergeIndex == incomeCheck.mergedIncome.length) {
                                                                                                    incomeCount++;
                                                                                                    if (incomeCount >= incomePromises.length) {
                                                                                                        if (usrCount < totalUserActive) {
                                                                                                            getUsersIncomeSources(userpromises[usrCount].id)
                                                                                                        }
                                                                                                    }
                                                                                                    else {
                                                                                                        getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                                                    }
                                                                                                }
                                                                                                else {
                                                                                                    assignmerge(incomeCheck.mergedIncome[_mergeIndex]);
                                                                                                }
                                                                                            }).catch((err) => {
                                                                                                console.log("err 1", err)
                                                                                                if (_mergeIndex == incomeCheck.mergedIncome.length) {
                                                                                                    incomeCount++;
                                                                                                    if (incomeCount >= incomePromises.length) {
                                                                                                        if (usrCount < totalUserActive) {
                                                                                                            getUsersIncomeSources(userpromises[usrCount].id)
                                                                                                        }
                                                                                                    }
                                                                                                    else {
                                                                                                        getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                                                    }
                                                                                                }
                                                                                                else {
                                                                                                    assignmerge(incomeCheck.mergedIncome[_mergeIndex]);
                                                                                                }
                                                                                            })
                                                                                        }).catch((err) => {
                                                                                            console.log("err 2", err)
                                                                                            if (_mergeIndex == incomeCheck.mergedIncome.length) {
                                                                                                incomeCount++;
                                                                                                if (incomeCount >= incomePromises.length) {
                                                                                                    if (usrCount < totalUserActive) {
                                                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                                                    }
                                                                                                }
                                                                                                else {
                                                                                                    getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                                                }
                                                                                            }
                                                                                            else {
                                                                                                assignmerge(incomeCheck.mergedIncome[_mergeIndex]);
                                                                                            }
                                                                                        })
                                                                                    }
                                                                                }).catch((err) => {
                                                                                    console.log("err 3", err)
                                                                                    if (_mergeIndex == incomeCheck.mergedIncome.length) {
                                                                                        incomeCount++;
                                                                                        if (incomeCount >= incomePromises.length) {
                                                                                            if (usrCount < totalUserActive) {
                                                                                                getUsersIncomeSources(userpromises[usrCount].id)
                                                                                            }
                                                                                        }
                                                                                        else {
                                                                                            getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                                        }
                                                                                    }
                                                                                    else {
                                                                                        assignmerge(incomeCheck.mergedIncome[_mergeIndex]);
                                                                                    }
                                                                                })
                                                                            }
                                                                        }
                                                                    }

                                                                })
                                                            }
                                                            else {
                                                                if (_mergeIndex == incomeCheck.mergedIncome.length) {
                                                                    incomeCount++;
                                                                    if (incomeCount >= incomePromises.length) {
                                                                        if (usrCount < totalUserActive) {
                                                                            getUsersIncomeSources(userpromises[usrCount].id)
                                                                        }
                                                                    }
                                                                    else {
                                                                        getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                    }
                                                                }

                                                                else {
                                                                    assignmerge(incomeCheck.mergedIncome[_mergeIndex]);
                                                                }
                                                            }

                                                        }
                                                        else {
                                                            if (_mergeIndex == incomeCheck.mergedIncome.length) {
                                                                incomeCount++;
                                                                if (incomeCount >= incomePromises.length) {
                                                                    if (usrCount < totalUserActive) {
                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                    }
                                                                }
                                                                else {
                                                                    getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                }
                                                            }
                                                            else {
                                                                assignmerge(incomeCheck.mergedIncome[_mergeIndex]);
                                                            }
                                                        }
                                                    }
                                                    incomeCheck.mergedIncome.forEach((merge, _mergeIndex) => {
                                                        console.log("merge index", _mergeIndex);
                                                        if (merge.payDates && merge.payDates.length) {
                                                            let lastAssigned = (merge.payDates.sort((a, b) => (b.toDate()).getTime() - (a.toDate()).getTime())[0]).toDate();
                                                            var nextDate = new Date(recurrTillDate);
                                                            var diff = new DateDiff(nextDate, lastAssigned);
                                                            let numDays = diff.days();
                                                            let numMonth = diff.months();
                                                            var totalPaychecksReccured = 0;
                                                            var mode1 = merge.repeatingType;
                                                            const dayDifferance = merge.dayDifference;
                                                            const modeDaysDiff = getDayDiifer(incomeCheck.repeating.type);
                                                            let addpayDate = [];
                                                            if (mode1 == "weekly") {
                                                                var c = numDays / 7;
                                                                for (var i = 0; i < Math.floor(c); i++) {
                                                                    addpayDate.push(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth(), lastAssigned.getDate() + (7 * (i + 1))));
                                                                }
                                                                totalPaychecksReccured = addpayDate.length;
                                                            }
                                                            else if (mode1 == "monthly") {
                                                                var c = numMonth;
                                                                for (var i = 0; i < Math.floor(c); i++) {
                                                                    addpayDate.push(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth() + 1, lastAssigned.getDate() + (7 * i)));
                                                                    totalPaychecksReccured = addpayDate.length;
                                                                }
                                                            }
                                                            else if (mode1 == "semimonthly") {
                                                                for (var i = 0; i < Math.ceil(numMonth); i++) {
                                                                    if (merge.weeks && merge.weeks.dateFormat === 'weekly') {
                                                                        var firstWeekOfDate = getDateofWeek(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth() + i + 1, lastAssigned.getDate()), merge.weeks.weekDays);
                                                                        addpayDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * merge.weeks.weekNumber[0]) - 7)));
                                                                        addpayDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * merge.weeks.weekNumber[1]) - 7)));
                                                                    }
                                                                    else if (merge.weeks && merge.weeks.dateFormat === 'Date') {
                                                                        var currentDate = new Date(lastAssigned.setMonth(lastAssigned.getMonth() + i + 1));
                                                                        addpayDate.push(new Date(currentDate.setDate(merge.weeks.monthDays[0])));
                                                                        addpayDate.push(new Date(currentDate.setDate(merge.weeks.monthDays[1])));
                                                                    }
                                                                    totalPaychecksReccured = addpayDate.length;
                                                                }

                                                            }
                                                            else if (mode1 == "biweekly") {
                                                                var c = numDays / 14;
                                                                for (var i = 0; i < Math.floor(c); i++) {
                                                                    addpayDate.push(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth(), lastAssigned.getDate() + (14 * (i + 1))));
                                                                    totalPaychecksReccured = addpayDate.length;
                                                                }
                                                            }
                                                            if (addpayDate.length) {
                                                                console.log("add pay  length", addpayDate.length)
                                                                addpayDate.forEach((payDay) => {
                                                                    let nearestPayDate = [];
                                                                    payDate.filter(o => {
                                                                        if (o.getTime() <= payDay.getTime()) {
                                                                            nearestPayDate.push(o)
                                                                        }
                                                                    })
                                                                    if (nearestPayDate.length) {
                                                                        console.log("nearestPayDate pay  length", nearestPayDate.length)
                                                                        nearestPayDate = nearestPayDate.sort((a, b) => b.getTime() - a.getTime())
                                                                        let diff = new DateDiff(nearestPayDate[0], payDay);
                                                                        let days = diff.days();
                                                                        if (Math.abs(days) <= dayDifferance && Math.abs(days) <= modeDaysDiff) {
                                                                            if (days === modeDaysDiff && mode === 'weekly' && (mode1 === 'biweekly' || mode1 === 'semimonthly')) {
                                                                                console.log("isnt possible right now???????")
                                                                            }
                                                                            else {
                                                                                incomePaycheckRef.collection("paychecks").where("payDate", "==", nearestPayDate[0]).get().then((paycheckUpdate) => {
                                                                                    if (paycheckUpdate.docs.length) {
                                                                                        console.log("paycheckUpdate docs length", paycheckUpdate.docs.length)
                                                                                        let documentData = paycheckUpdate.docs[0].data();
                                                                                        let docsID = paycheckUpdate.docs[0].id;
                                                                                        var add_incomes = [];
                                                                                        if (documentData.add_incomes) {
                                                                                            add_incomes = documentData.add_incomes;
                                                                                        }
                                                                                        var totalReceived = documentData.totalReceived === 0 ? documentData.totalExpected : documentData.totalReceived;
                                                                                        var totalspentAmount = documentData.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                                            return a + b;
                                                                                        }, 0);
                                                                                        var totalBudgetAmount = documentData.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                                            return a + b;
                                                                                        }, 0);
                                                                                        var budgetsAvailable = totalReceived - totalspentAmount + merge.income;
                                                                                        var budgetsToBeBudgeted = totalReceived - totalBudgetAmount + merge.income;
                                                                                        var totalExpected = documentData.totalExpected + merge.income;
                                                                                        add_incomes.push({
                                                                                            "name": merge.name,
                                                                                            "isRepeating": merge.isRepeating,
                                                                                            "repeatingType": merge.repeatingType,
                                                                                            "startDate": payDay.toLocaleDateString(),
                                                                                            "income": merge.income,
                                                                                            "dayDifference": merge.dayDifference,
                                                                                        })
                                                                                        incomePaycheckRef.collection("paychecks").doc(docsID).update({
                                                                                            budgetsAvailable: budgetsAvailable,
                                                                                            totalExpected: totalExpected,
                                                                                            budgetsToBeBudgeted: budgetsToBeBudgeted,
                                                                                            add_incomes: add_incomes
                                                                                        }).then(() => {
                                                                                            console.log("this paycheck is updated", docsID)
                                                                                            incomeCheck.mergedIncome[_mergeIndex].payDates.push(admin.firestore.Timestamp.fromDate(payDay))
                                                                                            incomePaycheckRef.update({
                                                                                                mergedIncome: incomeCheck.mergedIncome
                                                                                            }).then((res) => {
                                                                                                console.log("this income is updated", userId);
                                                                                                console.log("incomeCheck.mergedIncome", _mergeIndex, (incomeCheck.mergedIncome.length - 1))
                                                                                                if (_mergeIndex === (incomeCheck.mergedIncome.length - 1)) {
                                                                                                    incomeCount++;
                                                                                                    if (incomeCount >= incomePromises.length) {
                                                                                                        if (usrCount < totalUserActive) {
                                                                                                            getUsersIncomeSources(userpromises[usrCount].id)
                                                                                                        }
                                                                                                    }
                                                                                                    else {
                                                                                                        getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                                                    }
                                                                                                }
                                                                                            }).catch((err) => {
                                                                                                console.log("err 1", err)
                                                                                                if (_mergeIndex === (incomeCheck.mergedIncome.length - 1)) {
                                                                                                    incomeCount++;
                                                                                                    if (incomeCount >= incomePromises.length) {
                                                                                                        if (usrCount < totalUserActive) {
                                                                                                            getUsersIncomeSources(userpromises[usrCount].id)
                                                                                                        }
                                                                                                    }
                                                                                                    else {
                                                                                                        getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                                                    }
                                                                                                }
                                                                                            })
                                                                                        }).catch((err) => {
                                                                                            console.log("err 2", err)
                                                                                            if (_mergeIndex === (incomeCheck.mergedIncome.length - 1)) {
                                                                                                incomeCount++;
                                                                                                if (incomeCount >= incomePromises.length) {
                                                                                                    if (usrCount < totalUserActive) {
                                                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                                                    }
                                                                                                }
                                                                                                else {
                                                                                                    getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                                                }
                                                                                            }
                                                                                        })
                                                                                    }
                                                                                }).catch((err) => {
                                                                                    console.log("err 3", err)
                                                                                    if (_mergeIndex === (incomeCheck.mergedIncome.length - 1)) {
                                                                                        incomeCount++;
                                                                                        if (incomeCount >= incomePromises.length) {
                                                                                            if (usrCount < totalUserActive) {
                                                                                                getUsersIncomeSources(userpromises[usrCount].id)
                                                                                            }
                                                                                        }
                                                                                        else {
                                                                                            getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                                        }
                                                                                    }
                                                                                })
                                                                            }
                                                                        }
                                                                    }

                                                                })
                                                            }
                                                            else {
                                                                if (_mergeIndex === (incomeCheck.mergedIncome.length - 1)) {
                                                                    incomeCount++;
                                                                    if (incomeCount >= incomePromises.length) {
                                                                        if (usrCount < totalUserActive) {
                                                                            getUsersIncomeSources(userpromises[usrCount].id)
                                                                        }
                                                                    }
                                                                    else {
                                                                        getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                    }
                                                                }
                                                            }

                                                        }
                                                        else {
                                                            if (_mergeIndex === (incomeCheck.mergedIncome.length - 1)) {
                                                                incomeCount++;
                                                                if (incomeCount >= incomePromises.length) {
                                                                    if (usrCount < totalUserActive) {
                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                    }
                                                                }
                                                                else {
                                                                    getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                }
                                                            }
                                                        }
                                                    });
                                                }
                                                else {
                                                    incomeCount++;
                                                    if (incomeCount >= incomePromises.length) {
                                                        if (usrCount < totalUserActive) {
                                                            getUsersIncomeSources(userpromises[usrCount].id)
                                                        }
                                                    }
                                                    else {
                                                        getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                    }
                                                }


                                            }
                                            function getDateofWeek(startDate, days) {
                                                let date = moment().set('year', startDate.getFullYear()).set('month', startDate.getMonth()).set('date', 1);
                                                let firstDay = moment().set('year', startDate.getFullYear()).set('month', startDate.getMonth()).set('date', 1).weekday();
                                                if (firstDay == days) {
                                                    return new Date(date)
                                                } else {
                                                    let b = (days - firstDay);
                                                    if (b > 0) {
                                                        return new Date(date.add(b, 'days'));
                                                    } else {
                                                        let c = 7 - Math.abs(b);
                                                        return new Date(date.add(c, 'days'));
                                                    }
                                                }
                                            }
                                        }
                                        else {
                                            incomeCount++;
                                            if (incomeCount >= incomePromises.length) {
                                                if (usrCount < totalUserActive) {
                                                    getUsersIncomeSources(userpromises[usrCount].id)
                                                }
                                            }
                                            else {
                                                getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                            }
                                        }
                                    }).catch((error) => {
                                        console.log(error);
                                        incomeCount++;
                                        if (incomeCount >= incomePromises.length) {
                                            if (usrCount < totalUserActive) {
                                                getUsersIncomeSources(userpromises[usrCount].id)
                                            }
                                        }
                                        else {
                                            getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                        }
                                    });
                                }
                            }
                            else {
                                if (usrCount < totalUserActive) {
                                    getUsersIncomeSources(userpromises[usrCount].id)
                                }
                            }

                        }).catch(err => {
                            console.log(err);
                            if (usrCount < totalUserActive) {
                                getUsersIncomeSources(userpromises[usrCount].id)
                            }
                        })
                    }
                    else {
                        if (usrCount < totalUserActive) {
                            getUsersIncomeSources(userpromises[usrCount].id)
                        }
                        else {
                            console.log('all users length is', totalUserActive);
                        }
                    }
                }

            }
            else {
                console.log('no user found for run this query')
            }
        }
    }).catch((error) => {
        console.log("er while the runu", error)
    });
    return null;
});

exports.dailyJobCopy = functions.pubsub.schedule('every 5 minutes').onRun(context => {
    // const usersRef = admin.firestore().collection("income_source").where("active", "==", true);
    // usersRef.get().then(async (snapUsers) => {
    var userpromises = [];
    // if (snapUsers.docs.length) {
    // snapUsers.docs.map(async (o) => userpromises.push({ id: o.id }));
    userpromises.push({ id: 'Z8eCiLx0iCZzIXYpwBLSBqtQ9DE3' })
    var usrCount = 0;
    if (userpromises.length) {
        const totalUserActive = userpromises.length;
        getUsersIncomeSources(userpromises[usrCount].id);
        function getUsersIncomeSources(user_Id) {
            usrCount++;
            if (user_Id) {
                const incomeRef = admin.firestore().collection("income_source").doc(user_Id).collection("incomes").where("isRepeating", "==", true);
                incomeRef.get().then(async (snap) => {
                    var incomePromises = [];
                    if (snap.docs.length) {
                        snap.docs.map(async (o) => incomePromises.push({ id: o.id }));
                        let incomeCount = 0;
                        getUsersIncomeAndPaycheck(user_Id, incomePromises[incomeCount].id)
                        function getUsersIncomeAndPaycheck(uid, documentId) {
                            const userId = uid;
                            const incomeSourceId = documentId;
                            const incomePaycheckRef = admin.firestore().collection("income_source").doc(userId).collection("incomes").doc(incomeSourceId);
                            incomePaycheckRef.get().then((snapIncome) => {
                                if (snapIncome.exists) {
                                    var incomeCheck = snapIncome.data();
                                    var today = new Date();
                                    var recurrTillDate = today.setMonth(today.getMonth() + 1);
                                    let repeatingDates = [];
                                    incomeCheck.repeating.payDays.filter(o => repeatingDates.push(o.toDate()))
                                    let lastDate;
                                    if (repeatingDates) {
                                        repeatingDates.sort((a, b) => (new Date(b).getTime()) - (new Date(a).getTime()))
                                        lastDate = repeatingDates[0];
                                    }
                                    else {
                                        lastDate = incomeCheck.repeating.payDays[incomeCheck.repeating.payDays.length - 1].toDate();
                                    }
                                    var nextDate = new Date(recurrTillDate);
                                    var diff = new DateDiff(nextDate, lastDate);
                                    let numDays = diff.days();
                                    let numMonth = diff.months();
                                    var totalPaychecksReccured = 0;
                                    var mode = incomeCheck.repeating.type;
                                    let payDate = [];
                                    if (mode == "weekly") {
                                        var c = numDays / 7;
                                        for (var i = 0; i < Math.floor(c); i++) {
                                            payDate.push(new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + (7 * (i + 1))));
                                        }
                                        totalPaychecksReccured = payDate.length;
                                    }
                                    else if (mode == "monthly") {
                                        for (var i = 0; i < Math.floor(numMonth); i++) {
                                            if (incomeCheck.weeks && incomeCheck.weeks != null) {
                                                var firstWeekOfDate = getDateofWeek(new Date(lastDate.getFullYear(), lastDate.getMonth() + i + 1, lastDate.getDate()), incomeCheck.weeks.weekDays);
                                                payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * incomeCheck.weeks.weekNumber[0]) - 7)));
                                            } else {
                                                payDate.push(new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, lastDate.getDate() + (7 * i)));

                                            }
                                            totalPaychecksReccured = payDate.length;
                                        }
                                    }
                                    else if (mode == "semimonthly") {
                                        for (var i = 0; i < Math.ceil(numMonth); i++) {
                                            if (incomeCheck.weeks.dateFormat === 'weekly') {
                                                var firstWeekOfDate = getDateofWeek(new Date(lastDate.getFullYear(), lastDate.getMonth() + i + 1, lastDate.getDate()), incomeCheck.weeks.weekDays);
                                                payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * incomeCheck.weeks.weekNumber[0]) - 7)));
                                                payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * incomeCheck.weeks.weekNumber[1]) - 7)));
                                            }
                                            else if (incomeCheck.weeks.dateFormat === 'Date') {
                                                var currentDate = new Date(new Date(new Date(new Date().setFullYear(lastDate.getFullYear())).setMonth(lastDate.getMonth() + i + 1)).setDate(lastDate.getDate()));
                                                payDate.push(new Date(currentDate.setDate(incomeCheck.weeks.monthDays[0])));
                                                payDate.push(new Date(currentDate.setDate(incomeCheck.weeks.monthDays[1])));
                                            }
                                            totalPaychecksReccured = payDate.length;
                                        }

                                    }
                                    else if (mode == "biweekly") {
                                        var c = numDays / 14;
                                        for (var i = 0; i < Math.floor(c); i++) {
                                            payDate.push(new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + (14 * (i + 1))));
                                            totalPaychecksReccured = payDate.length;
                                        }
                                    }
                                    var template = [];
                                    if (incomeCheck.budgetTemplate.budgetTemplateDetails.length) {
                                        incomeCheck.budgetTemplate.budgetTemplateDetails.forEach(function (i) {
                                            template.push({
                                                "category": i.category,
                                                "category_id": i.category_id,
                                                "budgeted": i.budgeted,
                                                "spent": 0,
                                                "available": i.budgeted,
                                                "transactions": [],
                                                "goalId": i.goalId ? i.goalId : []
                                            })
                                        });
                                    }
                                    var surplusBudgetTemplate = [];
                                    if (payDate.length) {
                                        payDate = payDate.filter((v, i, a) => a.findIndex(t => (new Date(t.toLocaleDateString()).getTime() === new Date(v.toLocaleDateString()).getTime())) === i)
                                        addPayChecks(0)
                                    }
                                    else {
                                        incomeCount++;
                                        if (incomeCount >= incomePromises.length) {
                                            if (usrCount < totalUserActive) {
                                                getUsersIncomeSources(userpromises[usrCount].id)
                                            }
                                        }
                                        else {
                                            getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                        }
                                    }
                                    // adding new paycheck to income source.
                                    function addPayChecks(key) {
                                        if (key < payDate.length) {
                                            incomePaycheckRef.collection("paychecks").get().then((snapDocs) => {
                                                var paychecksArray = [];
                                                var add_incomes = [];
                                                let totalAddIncome = 0;
                                                if (snapDocs.docs.length) {
                                                    snapDocs.docs.filter(o => paychecksArray.push(Object.assign({ id: o.id }, o.data())));
                                                    paychecksArray = paychecksArray.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp);
                                                    var totaltemplateSurplus = surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                        return a + b;
                                                    }, 0);
                                                    var totalBudgetAmount = template.map(o => o.budgeted).reduce(function (a, b) {
                                                        return a + b;
                                                    }, 0);
                                                    var totaltmplspentAmount = template.map(o => o.spent).reduce(function (a, b) {
                                                        return a + b;
                                                    }, 0);
                                                    if (paychecksArray.length) {
                                                        incomePaycheckRef.collection("paychecks").add({
                                                            "name": `${new Date(payDate[key]).toLocaleDateString()} Paycheck`,
                                                            "payDate": new Date(payDate[key]),
                                                            'add_incomes': add_incomes.length ? add_incomes : [],
                                                            "payDateTimeStamp": new Date(payDate[key]).getTime(),
                                                            "totalExpected": incomeCheck.budgetTemplate.totalExpected + totalAddIncome,
                                                            "totalReceived": 0,
                                                            "surplusBudgetTemplate": key == 0 ? surplusBudgetTemplate : [],
                                                            "receivedPaycheckTransaction": [],
                                                            "budgetsAvailable": (incomeCheck.budgetTemplate.totalExpected - totaltmplspentAmount + totaltemplateSurplus + totalAddIncome),
                                                            "budgetsCurrent": totalBudgetAmount,
                                                            "budgetsToBeBudgeted": (incomeCheck.budgetTemplate.totalExpected - totalBudgetAmount + totaltemplateSurplus + totalAddIncome),
                                                            "isOverbudget": (incomeCheck.budgetTemplate.totalExpected - totalBudgetAmount + totaltemplateSurplus + totalAddIncome) < 0 ? true : false,
                                                            "isOverspent": (incomeCheck.budgetTemplate.totalExpected - totaltmplspentAmount + totaltemplateSurplus + totalAddIncome) < 0 ? true : false,
                                                            "budgetDetails": template,
                                                            "rolloverBudgetTemplate": template
                                                        }).then((addSnap) => {
                                                            incomeCheck.repeating.payDays.push(payDate[key]);
                                                            incomeCheck.paycheckIds.push(addSnap.id);
                                                            incomePaycheckRef.update({
                                                                paycheckIds: incomeCheck.paycheckIds,
                                                                mergedIncome: incomeCheck.mergedIncome,
                                                                ['repeating.payDays']: incomeCheck.repeating.payDays,
                                                            }).then(() => {
                                                                //console.log("paydate added level 2", JSON.stringify(payDate[key]))//Ray changes
                                                                key++;
                                                                if (key < payDate.length) {
                                                                    addPayChecks(key);
                                                                }
                                                                else {

                                                                    addExtraIncome(payDate)
                                                                }
                                                            }).catch((error) => {
                                                                //console.log(error);//Ray changes
                                                                key++;
                                                                if (key < payDate.length) {
                                                                    addPayChecks(key);
                                                                }
                                                                else {

                                                                    addExtraIncome(payDate)
                                                                }
                                                            });

                                                        }).catch((error) => {
                                                            // console.log(error);//Ray changes
                                                            key++;
                                                            if (key < payDate.length) {
                                                                addPayChecks(key);
                                                            }
                                                            else {

                                                                addExtraIncome(payDate)
                                                            }
                                                        });
                                                    }
                                                    else {
                                                        incomePaycheckRef.collection("paychecks").add({
                                                            "name": `${new Date(payDate[key]).toLocaleDateString()} Paycheck`,
                                                            "payDate": new Date(payDate[key]),
                                                            "payDateTimeStamp": new Date(payDate[key]).getTime(),
                                                            "totalExpected": incomeCheck.budgetTemplate.totalExpected,
                                                            "totalReceived": 0,
                                                            'add_incomes': [],
                                                            "surplusBudgetTemplate": key == 0 ? surplusBudgetTemplate : [],
                                                            "receivedPaycheckTransaction": [],
                                                            "budgetsAvailable": (incomeCheck.budgetTemplate.totalExpected - totaltmplspentAmount + totaltemplateSurplus),
                                                            "budgetsCurrent": totalBudgetAmount,
                                                            "budgetsToBeBudgeted": (incomeCheck.budgetTemplate.totalExpected - totalBudgetAmount + totaltemplateSurplus),
                                                            "isOverbudget": (incomeCheck.budgetTemplate.totalExpected - totalBudgetAmount + totaltemplateSurplus) < 0 ? true : false,
                                                            "isOverspent": (incomeCheck.budgetTemplate.totalExpected - totaltmplspentAmount + totaltemplateSurplus) < 0 ? true : false,
                                                            "budgetDetails": template,
                                                            "rolloverBudgetTemplate": template
                                                        }).then((addSnap) => {
                                                            incomeCheck.repeating.payDays.push(payDate[key]);
                                                            incomeCheck.paycheckIds.push(addSnap.id);
                                                            incomePaycheckRef.update({
                                                                paycheckIds: incomeCheck.paycheckIds,
                                                                ['repeating.payDays']: incomeCheck.repeating.payDays,
                                                            }).then(() => {
                                                                // console.log("paydate added level 1", JSON.stringify(payDate[key]))//Ray changes
                                                                key++;
                                                                if (key < payDate.length) {
                                                                    addPayChecks(key);
                                                                }
                                                                else {

                                                                    addExtraIncome(payDate)
                                                                }
                                                            }).catch((error) => {
                                                                // console.log(error);//Ray changes
                                                                key++;
                                                                if (key < payDate.length) {
                                                                    addPayChecks(key);
                                                                }
                                                                else {

                                                                    addExtraIncome(payDate)
                                                                }
                                                            });
                                                        }).catch((error) => {
                                                            // console.log(error);//Ray changes
                                                            key++;
                                                            if (key < payDate.length) {
                                                                addPayChecks(key);
                                                            }
                                                            else {

                                                                addExtraIncome(payDate)
                                                            }
                                                        });
                                                    }
                                                }
                                                else {
                                                    key++;
                                                    if (key < payDate.length) {
                                                        addPayChecks(key);
                                                    }
                                                    else {

                                                        addExtraIncome(payDate)
                                                    }
                                                }
                                            }).catch((error) => {
                                                // console.log(error);//Ray changes
                                                key++;
                                                if (key < payDate.length) {
                                                    addPayChecks(key);
                                                }
                                                else {
                                                    addExtraIncome(payDate)
                                                }

                                            });
                                        }
                                        else {
                                            addExtraIncome(payDate)
                                        }
                                    }
                                    // adding extra incomesources which is merged previously.
                                    function addExtraIncome(newPayDates) {
                                        if (incomeCheck.mergedIncome && incomeCheck.mergedIncome.length) {
                                            // console.log("income merge length", incomeCheck.mergedIncome.length)//Ray changes
                                            var _mergeIndex = 0;
                                            assignmerge(incomeCheck.mergedIncome[_mergeIndex])
                                            function assignmerge(merge) {
                                                _mergeIndex++;
                                                if (merge.payDates && merge.payDates.length) {
                                                    let lastAssigned = (merge.payDates.sort((a, b) => (b.toDate()).getTime() - (a.toDate()).getTime())[0]).toDate();
                                                    var nextDate = new Date(recurrTillDate);
                                                    var diff = new DateDiff(nextDate, lastAssigned);
                                                    let numDays = diff.days();
                                                    let numMonth = diff.months();
                                                    var totalPaychecksReccured = 0;
                                                    var mode1 = merge.repeatingType;
                                                    const dayDifferance = merge.dayDifference;
                                                    const modeDaysDiff = getDayDiifer(incomeCheck.repeating.type);
                                                    let addpayDate = [];
                                                    if (mode1 == "weekly") {
                                                        var c = numDays / 7;
                                                        for (var i = 0; i < Math.floor(c); i++) {
                                                            addpayDate.push(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth(), lastAssigned.getDate() + (7 * (i + 1))));
                                                        }
                                                        totalPaychecksReccured = addpayDate.length;
                                                    }
                                                    else if (mode1 == "monthly") {
                                                        var c = numMonth;
                                                        for (var i = 0; i < Math.floor(c); i++) {
                                                            addpayDate.push(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth() + 1, lastAssigned.getDate() + (7 * i)));
                                                            totalPaychecksReccured = addpayDate.length;
                                                        }
                                                    }
                                                    else if (mode1 == "semimonthly") {
                                                        for (var i = 0; i < Math.ceil(numMonth); i++) {
                                                            if (merge.weeks && merge.weeks.dateFormat === 'weekly') {
                                                                var firstWeekOfDate = getDateofWeek(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth() + i + 1, lastAssigned.getDate()), merge.weeks.weekDays);
                                                                addpayDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * merge.weeks.weekNumber[0]) - 7)));
                                                                addpayDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * merge.weeks.weekNumber[1]) - 7)));
                                                            }
                                                            else if (merge.weeks && merge.weeks.dateFormat === 'Date') {
                                                                var currentDate = new Date(new Date(new Date(new Date().setFullYear(lastDate.getFullYear())).setMonth(lastDate.getMonth() + i + 1)).setDate(lastDate.getDate()));
                                                                addpayDate.push(new Date(currentDate.setDate(merge.weeks.monthDays[0])));
                                                                addpayDate.push(new Date(currentDate.setDate(merge.weeks.monthDays[1])));
                                                            }
                                                            totalPaychecksReccured = addpayDate.length;
                                                        }

                                                    }
                                                    else if (mode1 == "biweekly") {
                                                        var c = numDays / 14;
                                                        for (var i = 0; i < Math.floor(c); i++) {
                                                            addpayDate.push(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth(), lastAssigned.getDate() + (14 * (i + 1))));
                                                            totalPaychecksReccured = addpayDate.length;
                                                        }
                                                    }
                                                    if (addpayDate.length) {
                                                        // console.log("add pay  length", addpayDate.length)//Ray changes
                                                        addpayDate.forEach((payDay) => {
                                                            let nearestPayDate = [];
                                                            payDate.filter(o => {
                                                                if (o.getTime() <= payDay.getTime()) {
                                                                    nearestPayDate.push(o)
                                                                }
                                                            })
                                                            if (nearestPayDate.length) {
                                                                // console.log("nearestPayDate pay  length", nearestPayDate.length)//Ray changes
                                                                nearestPayDate = nearestPayDate.sort((a, b) => b.getTime() - a.getTime())
                                                                let diff = new DateDiff(nearestPayDate[0], payDay);
                                                                let days = diff.days();
                                                                if (Math.abs(days) <= dayDifferance && Math.abs(days) <= modeDaysDiff) {
                                                                    if (days === modeDaysDiff && mode === 'weekly' && (mode1 === 'biweekly' || mode1 === 'semimonthly')) {
                                                                        // console.log("isnt possible right now???????")//Ray changes
                                                                    }
                                                                    else {
                                                                        incomePaycheckRef.collection("paychecks").where("payDate", "==", nearestPayDate[0]).get().then((paycheckUpdate) => {
                                                                            if (paycheckUpdate.docs.length) {
                                                                                // console.log("paycheckUpdate docs length", paycheckUpdate.docs.length)//Ray changes
                                                                                let documentData = paycheckUpdate.docs[0].data();
                                                                                let docsID = paycheckUpdate.docs[0].id;
                                                                                var add_incomes = [];
                                                                                if (documentData.add_incomes) {
                                                                                    add_incomes = documentData.add_incomes;
                                                                                }
                                                                                var totalReceived = documentData.totalReceived === 0 ? documentData.totalExpected : documentData.totalReceived;
                                                                                var totalspentAmount = documentData.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                                    return a + b;
                                                                                }, 0);
                                                                                var totalBudgetAmount = documentData.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                                    return a + b;
                                                                                }, 0);
                                                                                var budgetsAvailable = totalReceived - totalspentAmount + merge.income;
                                                                                var budgetsToBeBudgeted = totalReceived - totalBudgetAmount + merge.income;
                                                                                var totalExpected = documentData.totalExpected + merge.income;
                                                                                add_incomes.push({
                                                                                    "name": merge.name,
                                                                                    "isRepeating": merge.isRepeating,
                                                                                    "repeatingType": merge.repeatingType,
                                                                                    "startDate": payDay.toLocaleDateString(),
                                                                                    "income": merge.income,
                                                                                    "dayDifference": merge.dayDifference,
                                                                                })
                                                                                incomePaycheckRef.collection("paychecks").doc(docsID).update({
                                                                                    budgetsAvailable: budgetsAvailable,
                                                                                    totalExpected: totalExpected,
                                                                                    budgetsToBeBudgeted: budgetsToBeBudgeted,
                                                                                    add_incomes: add_incomes
                                                                                }).then(() => {
                                                                                    // console.log("this paycheck is updated", docsID)//Ray changes
                                                                                    incomeCheck.mergedIncome[_mergeIndex].payDates.push(admin.firestore.Timestamp.fromDate(payDay))
                                                                                    incomePaycheckRef.update({
                                                                                        mergedIncome: incomeCheck.mergedIncome
                                                                                    }).then((res) => {
                                                                                        // console.log("this income is updated", userId);//Ray changes
                                                                                        // console.log("incomeCheck.mergedIncome", _mergeIndex, (incomeCheck.mergedIncome.length - 1))//Ray changes
                                                                                        if (_mergeIndex == incomeCheck.mergedIncome.length) {
                                                                                            incomeCount++;
                                                                                            if (incomeCount >= incomePromises.length) {
                                                                                                if (usrCount < totalUserActive) {
                                                                                                    getUsersIncomeSources(userpromises[usrCount].id)
                                                                                                }
                                                                                            }
                                                                                            else {
                                                                                                getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                                            }
                                                                                        }
                                                                                        else {
                                                                                            assignmerge(incomeCheck.mergedIncome[_mergeIndex]);
                                                                                        }
                                                                                    }).catch((err) => {
                                                                                        // console.log("err 1", err)//Ray changes
                                                                                        if (_mergeIndex == incomeCheck.mergedIncome.length) {
                                                                                            incomeCount++;
                                                                                            if (incomeCount >= incomePromises.length) {
                                                                                                if (usrCount < totalUserActive) {
                                                                                                    getUsersIncomeSources(userpromises[usrCount].id)
                                                                                                }
                                                                                            }
                                                                                            else {
                                                                                                getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                                            }
                                                                                        }
                                                                                        else {
                                                                                            assignmerge(incomeCheck.mergedIncome[_mergeIndex]);
                                                                                        }
                                                                                    })
                                                                                }).catch((err) => {
                                                                                    // console.log("err 2", err)//Ray changes
                                                                                    if (_mergeIndex == incomeCheck.mergedIncome.length) {
                                                                                        incomeCount++;
                                                                                        if (incomeCount >= incomePromises.length) {
                                                                                            if (usrCount < totalUserActive) {
                                                                                                getUsersIncomeSources(userpromises[usrCount].id)
                                                                                            }
                                                                                        }
                                                                                        else {
                                                                                            getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                                        }
                                                                                    }
                                                                                    else {
                                                                                        assignmerge(incomeCheck.mergedIncome[_mergeIndex]);
                                                                                    }
                                                                                })
                                                                            }
                                                                        }).catch((err) => {
                                                                            // console.log("err 3", err)//Ray changes
                                                                            if (_mergeIndex == incomeCheck.mergedIncome.length) {
                                                                                incomeCount++;
                                                                                if (incomeCount >= incomePromises.length) {
                                                                                    if (usrCount < totalUserActive) {
                                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                                    }
                                                                                }
                                                                                else {
                                                                                    getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                                }
                                                                            }
                                                                            else {
                                                                                assignmerge(incomeCheck.mergedIncome[_mergeIndex]);
                                                                            }
                                                                        })
                                                                    }
                                                                }
                                                            }

                                                        })
                                                    }
                                                    else {
                                                        if (_mergeIndex == incomeCheck.mergedIncome.length) {
                                                            incomeCount++;
                                                            if (incomeCount >= incomePromises.length) {
                                                                if (usrCount < totalUserActive) {
                                                                    getUsersIncomeSources(userpromises[usrCount].id)
                                                                }
                                                            }
                                                            else {
                                                                getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                            }
                                                        }

                                                        else {
                                                            assignmerge(incomeCheck.mergedIncome[_mergeIndex]);
                                                        }
                                                    }

                                                }
                                                else {
                                                    if (_mergeIndex == incomeCheck.mergedIncome.length) {
                                                        incomeCount++;
                                                        if (incomeCount >= incomePromises.length) {
                                                            if (usrCount < totalUserActive) {
                                                                getUsersIncomeSources(userpromises[usrCount].id)
                                                            }
                                                        }
                                                        else {
                                                            getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                        }
                                                    }
                                                    else {
                                                        assignmerge(incomeCheck.mergedIncome[_mergeIndex]);
                                                    }
                                                }
                                            }
                                            incomeCheck.mergedIncome.forEach((merge, _mergeIndex) => {
                                                // console.log("merge index", _mergeIndex);//Ray changes
                                                if (merge.payDates && merge.payDates.length) {
                                                    let lastAssigned = (merge.payDates.sort((a, b) => (b.toDate()).getTime() - (a.toDate()).getTime())[0]).toDate();
                                                    var nextDate = new Date(recurrTillDate);
                                                    var diff = new DateDiff(nextDate, lastAssigned);
                                                    let numDays = diff.days();
                                                    let numMonth = diff.months();
                                                    var totalPaychecksReccured = 0;
                                                    var mode1 = merge.repeatingType;
                                                    const dayDifferance = merge.dayDifference;
                                                    const modeDaysDiff = getDayDiifer(incomeCheck.repeating.type);
                                                    let addpayDate = [];
                                                    if (mode1 == "weekly") {
                                                        var c = numDays / 7;
                                                        for (var i = 0; i < Math.floor(c); i++) {
                                                            addpayDate.push(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth(), lastAssigned.getDate() + (7 * (i + 1))));
                                                        }
                                                        totalPaychecksReccured = addpayDate.length;
                                                    }
                                                    else if (mode1 == "monthly") {
                                                        var c = numMonth;
                                                        for (var i = 0; i < Math.floor(c); i++) {
                                                            addpayDate.push(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth() + 1, lastAssigned.getDate() + (7 * i)));
                                                            totalPaychecksReccured = addpayDate.length;
                                                        }
                                                    }
                                                    else if (mode1 == "semimonthly") {
                                                        for (var i = 0; i < Math.ceil(numMonth); i++) {
                                                            if (merge.weeks && merge.weeks.dateFormat === 'weekly') {
                                                                var firstWeekOfDate = getDateofWeek(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth() + i + 1, lastAssigned.getDate()), merge.weeks.weekDays);
                                                                addpayDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * merge.weeks.weekNumber[0]) - 7)));
                                                                addpayDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * merge.weeks.weekNumber[1]) - 7)));
                                                            }
                                                            else if (merge.weeks && merge.weeks.dateFormat === 'Date') {
                                                                var currentDate = new Date(lastAssigned.setMonth(lastAssigned.getMonth() + i + 1));
                                                                addpayDate.push(new Date(currentDate.setDate(merge.weeks.monthDays[0])));
                                                                addpayDate.push(new Date(currentDate.setDate(merge.weeks.monthDays[1])));
                                                            }
                                                            totalPaychecksReccured = addpayDate.length;
                                                        }

                                                    }
                                                    else if (mode1 == "biweekly") {
                                                        var c = numDays / 14;
                                                        for (var i = 0; i < Math.floor(c); i++) {
                                                            addpayDate.push(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth(), lastAssigned.getDate() + (14 * (i + 1))));
                                                            totalPaychecksReccured = addpayDate.length;
                                                        }
                                                    }
                                                    if (addpayDate.length) {
                                                        // console.log("add pay  length", addpayDate.length)//Ray changes
                                                        addpayDate.forEach((payDay) => {
                                                            let nearestPayDate = [];
                                                            payDate.filter(o => {
                                                                if (o.getTime() <= payDay.getTime()) {
                                                                    nearestPayDate.push(o)
                                                                }
                                                            })
                                                            if (nearestPayDate.length) {
                                                                // console.log("nearestPayDate pay  length", nearestPayDate.length)//Ray changes
                                                                nearestPayDate = nearestPayDate.sort((a, b) => b.getTime() - a.getTime())
                                                                let diff = new DateDiff(nearestPayDate[0], payDay);
                                                                let days = diff.days();
                                                                if (Math.abs(days) <= dayDifferance && Math.abs(days) <= modeDaysDiff) {
                                                                    if (days === modeDaysDiff && mode === 'weekly' && (mode1 === 'biweekly' || mode1 === 'semimonthly')) {
                                                                        // console.log("isnt possible right now???????")//Ray changes
                                                                    }
                                                                    else {
                                                                        incomePaycheckRef.collection("paychecks").where("payDate", "==", nearestPayDate[0]).get().then((paycheckUpdate) => {
                                                                            if (paycheckUpdate.docs.length) {
                                                                                // console.log("paycheckUpdate docs length", paycheckUpdate.docs.length)//Ray changes
                                                                                let documentData = paycheckUpdate.docs[0].data();
                                                                                let docsID = paycheckUpdate.docs[0].id;
                                                                                var add_incomes = [];
                                                                                if (documentData.add_incomes) {
                                                                                    add_incomes = documentData.add_incomes;
                                                                                }
                                                                                var totalReceived = documentData.totalReceived === 0 ? documentData.totalExpected : documentData.totalReceived;
                                                                                var totalspentAmount = documentData.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                                    return a + b;
                                                                                }, 0);
                                                                                var totalBudgetAmount = documentData.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                                    return a + b;
                                                                                }, 0);
                                                                                var budgetsAvailable = totalReceived - totalspentAmount + merge.income;
                                                                                var budgetsToBeBudgeted = totalReceived - totalBudgetAmount + merge.income;
                                                                                var totalExpected = documentData.totalExpected + merge.income;
                                                                                add_incomes.push({
                                                                                    "name": merge.name,
                                                                                    "isRepeating": merge.isRepeating,
                                                                                    "repeatingType": merge.repeatingType,
                                                                                    "startDate": payDay.toLocaleDateString(),
                                                                                    "income": merge.income,
                                                                                    "dayDifference": merge.dayDifference,
                                                                                })
                                                                                incomePaycheckRef.collection("paychecks").doc(docsID).update({
                                                                                    budgetsAvailable: budgetsAvailable,
                                                                                    totalExpected: totalExpected,
                                                                                    budgetsToBeBudgeted: budgetsToBeBudgeted,
                                                                                    add_incomes: add_incomes
                                                                                }).then(() => {
                                                                                    // console.log("this paycheck is updated", docsID)//Ray changes
                                                                                    incomeCheck.mergedIncome[_mergeIndex].payDates.push(admin.firestore.Timestamp.fromDate(payDay))
                                                                                    incomePaycheckRef.update({
                                                                                        mergedIncome: incomeCheck.mergedIncome
                                                                                    }).then((res) => {
                                                                                        // console.log("this income is updated", userId);//Ray changes
                                                                                        // console.log("incomeCheck.mergedIncome", _mergeIndex, (incomeCheck.mergedIncome.length - 1))//Ray changes
                                                                                        if (_mergeIndex === (incomeCheck.mergedIncome.length - 1)) {
                                                                                            incomeCount++;
                                                                                            if (incomeCount >= incomePromises.length) {
                                                                                                if (usrCount < totalUserActive) {
                                                                                                    getUsersIncomeSources(userpromises[usrCount].id)
                                                                                                }
                                                                                            }
                                                                                            else {
                                                                                                getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                                            }
                                                                                        }
                                                                                    }).catch((err) => {
                                                                                        // console.log("err 1", err)//Ray changes
                                                                                        if (_mergeIndex === (incomeCheck.mergedIncome.length - 1)) {
                                                                                            incomeCount++;
                                                                                            if (incomeCount >= incomePromises.length) {
                                                                                                if (usrCount < totalUserActive) {
                                                                                                    getUsersIncomeSources(userpromises[usrCount].id)
                                                                                                }
                                                                                            }
                                                                                            else {
                                                                                                getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                                            }
                                                                                        }
                                                                                    })
                                                                                }).catch((err) => {
                                                                                    // console.log("err 2", err)//Ray changes
                                                                                    if (_mergeIndex === (incomeCheck.mergedIncome.length - 1)) {
                                                                                        incomeCount++;
                                                                                        if (incomeCount >= incomePromises.length) {
                                                                                            if (usrCount < totalUserActive) {
                                                                                                getUsersIncomeSources(userpromises[usrCount].id)
                                                                                            }
                                                                                        }
                                                                                        else {
                                                                                            getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                                        }
                                                                                    }
                                                                                })
                                                                            }
                                                                        }).catch((err) => {
                                                                            // console.log("err 3", err)//Ray changes
                                                                            if (_mergeIndex === (incomeCheck.mergedIncome.length - 1)) {
                                                                                incomeCount++;
                                                                                if (incomeCount >= incomePromises.length) {
                                                                                    if (usrCount < totalUserActive) {
                                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                                    }
                                                                                }
                                                                                else {
                                                                                    getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                                                }
                                                                            }
                                                                        })
                                                                    }
                                                                }
                                                            }

                                                        })
                                                    }
                                                    else {
                                                        if (_mergeIndex === (incomeCheck.mergedIncome.length - 1)) {
                                                            incomeCount++;
                                                            if (incomeCount >= incomePromises.length) {
                                                                if (usrCount < totalUserActive) {
                                                                    getUsersIncomeSources(userpromises[usrCount].id)
                                                                }
                                                            }
                                                            else {
                                                                getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                            }
                                                        }
                                                    }

                                                }
                                                else {
                                                    if (_mergeIndex === (incomeCheck.mergedIncome.length - 1)) {
                                                        incomeCount++;
                                                        if (incomeCount >= incomePromises.length) {
                                                            if (usrCount < totalUserActive) {
                                                                getUsersIncomeSources(userpromises[usrCount].id)
                                                            }
                                                        }
                                                        else {
                                                            getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                                        }
                                                    }
                                                }
                                            });
                                        }
                                        else {
                                            incomeCount++;
                                            if (incomeCount >= incomePromises.length) {
                                                if (usrCount < totalUserActive) {
                                                    getUsersIncomeSources(userpromises[usrCount].id)
                                                }
                                            }
                                            else {
                                                getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                            }
                                        }


                                    }
                                    function getDateofWeek(startDate, days) {
                                        let date = moment().set('year', startDate.getFullYear()).set('month', startDate.getMonth()).set('date', 1);
                                        let firstDay = moment().set('year', startDate.getFullYear()).set('month', startDate.getMonth()).set('date', 1).weekday();
                                        if (firstDay == days) {
                                            return new Date(date)
                                        } else {
                                            let b = (days - firstDay);
                                            if (b > 0) {
                                                return new Date(date.add(b, 'days'));
                                            } else {
                                                let c = 7 - Math.abs(b);
                                                return new Date(date.add(c, 'days'));
                                            }
                                        }
                                    }
                                }
                                else {
                                    incomeCount++;
                                    if (incomeCount >= incomePromises.length) {
                                        if (usrCount < totalUserActive) {
                                            getUsersIncomeSources(userpromises[usrCount].id)
                                        }
                                    }
                                    else {
                                        getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                    }
                                }
                            }).catch((error) => {
                                // console.log(error);//Ray changes
                                incomeCount++;
                                if (incomeCount >= incomePromises.length) {
                                    if (usrCount < totalUserActive) {
                                        getUsersIncomeSources(userpromises[usrCount].id)
                                    }
                                }
                                else {
                                    getUsersIncomeAndPaycheck(uid, incomePromises[incomeCount].id)
                                }
                            });
                        }
                    }
                    else {
                        if (usrCount < totalUserActive) {
                            getUsersIncomeSources(userpromises[usrCount].id)
                        }
                    }

                }).catch(err => {
                    // console.log(err);//Ray changes
                    if (usrCount < totalUserActive) {
                        getUsersIncomeSources(userpromises[usrCount].id)
                    }
                })
            }
            else {
                if (usrCount < totalUserActive) {
                    getUsersIncomeSources(userpromises[usrCount].id)
                }
                else {
                    // console.log('all users length is', totalUserActive);//Ray changes
                }
            }
        }

    }
    else {
        // console.log('no user found for run this query')//Ray changes
    }
    // }
    // }).catch((error) => {
    //     console.log("er while the runu", error)
    // });
    return null;
});

exports.dailySubscriptionCheck = functions.pubsub.schedule('00 9 * * *').onRun(context => {
    const usersRef = admin.firestore().collection("users");
    usersRef.get().then((snapUsers) => {
        snapUsers.forEach(async (userDoc) => {
            let user = Object.assign({ id: userDoc.id }, userDoc.data());
            if (user.customer_id && user.subscription_id && user.sub_status) {
                const subscription = await stripe.subscriptions.retrieve(
                    user.subscription_id
                );
                userRef.doc(user.id).update({
                    sub_status: subscription.status
                })
            }
        })
    })
});

exports.deleteAccounts = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        const body = request.body;
        const deletacc = admin.firestore().collection('accounts').doc(body.userId).collection('bank_account').doc(body.accountId);
        const userPlaidRef = admin.firestore().collection('user_plaid_transaction').doc(body.userId).collection('transactions');
        const transref = admin.firestore().collection('user_transaction').doc(body.userId).collection('transactions');
        const goalRef = admin.firestore().collection("users").doc(body.userId).collection("goals");
        const incomeRef = admin.firestore().collection("income_source").doc(body.userId).collection("incomes");
        if (body.removeOnlyAccount) {
            deletacc.delete();
            return response.status(200).send({
                success: true,
                res: "delete successfully"
            });
        }
        else {
            userPlaidRef.where("account_id", "==", body.accountId).get().then(function (snap) {
                if (snap.docs.length) {
                    var plaidpromise = [];
                    var plaidCount = 0;
                    plaidpromise = snap.docs.map(o => o.id);
                    unAssignTransaction(body.userId, plaidpromise[plaidCount])
                    function unAssignTransaction(userId, transactionId) {
                        if (userId && transactionId) {
                            let type = "";
                            let assignment = [];
                            let plaidTransId = transactionId;
                            var error = [];
                            transref.where("plaidTransId", "==", transactionId).get().then((snapTrans) => {
                                if (snapTrans.docs.length) {
                                    snapTrans.docs.forEach(usrTrns => {
                                        let transId = usrTrns.id;
                                        const user_trans = usrTrns.data();
                                        type = user_trans.type;
                                        assignment = user_trans.assignment;
                                        const category = user_trans.category;
                                        const category_id = user_trans.category_id;
                                        plaidTransId = user_trans.plaidTransId;
                                        transref.doc(transId).delete();
                                        let count = 0;
                                        if (type === "income") {
                                            updateIncomePaycheks(assignment[count], user_trans.id);
                                            function updateIncomePaycheks(i, transId) {
                                                if (i) {
                                                    incomeRef.where("paycheckIds", "array-contains", i.paycheckId).get().then((income_snap) => {
                                                        if (income_snap.docs.length === 0) {
                                                            error.push(`paycheck id not exists: ${i.paycheckId}`);
                                                            count++;
                                                            if (count == assignment.length) {
                                                                updatePlaidCollection();
                                                            }
                                                            else {
                                                                updateIncomePaycheks(assignment[count], transId);
                                                            }
                                                        }
                                                        else {
                                                            const incomeSourceId = income_snap.docs[0].id;
                                                            const incomeSourceData = income_snap.docs[0].data();
                                                            let Mostrecent = [];
                                                            let paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(i.paycheckId);
                                                            paycheckGet.get().then((snapPayCheckReq) => {
                                                                var paycheckData = snapPayCheckReq.data();
                                                                let updatedTransIds = paycheckData.receivedPaycheckTransaction.filter(o => o != transId);
                                                                var totalspentAmount = paycheckData.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                    return a + b;
                                                                }, 0);
                                                                var totalBudgetAmount = paycheckData.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                    return a + b;
                                                                }, 0);
                                                                var totalReceived = ((paycheckData.totalReceived - Math.abs(i.amount)) === 0 ? paycheckData.totalExpected : (paycheckData.totalReceived - Math.abs(i.amount)))
                                                                var totalsurplusBudgetTemplate = paycheckData.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                    return a + b;
                                                                }, 0);
                                                                paycheckGet.update({
                                                                    totalReceived: admin.firestore.FieldValue.increment(- Math.abs(i.amount)),
                                                                    receivedPaycheckTransaction: updatedTransIds,
                                                                    budgetsCurrent: totalBudgetAmount,
                                                                    budgetsToBeBudgeted: (totalReceived - totalBudgetAmount + totalsurplusBudgetTemplate),
                                                                    budgetsAvailable: totalReceived - totalspentAmount + totalsurplusBudgetTemplate,
                                                                    isOverbudget: (totalReceived - totalBudgetAmount + totalsurplusBudgetTemplate) < 0 ? true : false,
                                                                    isOverspent: totalReceived - totalspentAmount + totalsurplusBudgetTemplate < 0 ? true : false
                                                                }).then(() => {
                                                                    incomeRef.doc(incomeSourceId).collection("paychecks").get().then((query) => {
                                                                        query.docs.filter(o => {
                                                                            if (o.data().payDateTimeStamp > paycheckData.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                                                Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                                                                Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                                                return;
                                                                            }
                                                                        })
                                                                        if (Mostrecent.length) {
                                                                            var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                                                            var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                                return a + b;
                                                                            }, 0);
                                                                            var recentbudgetedAmount = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                                return a + b;
                                                                            }, 0);
                                                                            var recentsurplusAmount = Mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                                return a + b;
                                                                            }, 0);
                                                                            incomeRef.doc(incomeSourceId).collection("paychecks").doc(Mostrecent[0].id).update({
                                                                                "surplusBudgetTemplate": Mostrecent[0].surplusBudgetTemplate,
                                                                                "budgetsCurrent": recentbudgetedAmount,
                                                                                "budgetsToBeBudgeted": (recentReceived - recentbudgetedAmount + recentsurplusAmount),
                                                                                "isOverbudget": (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                                                "budgetsAvailable": recentReceived - recentspentAmount + recentsurplusAmount,
                                                                                "isOverspent": (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                                            }).then(() => {
                                                                                count++;
                                                                                if (count === assignment.length) {
                                                                                    updatePlaidCollection();
                                                                                } else {
                                                                                    updateIncomePaycheks(assignment[count], transId);
                                                                                }
                                                                            }).catch(() => {
                                                                                count++;
                                                                                if (count === assignment.length) {
                                                                                    updatePlaidCollection();
                                                                                } else {
                                                                                    updateIncomePaycheks(assignment[count], transId);
                                                                                }
                                                                            });
                                                                        }
                                                                        else {
                                                                            count++;
                                                                            if (count === assignment.length) {
                                                                                updatePlaidCollection();
                                                                            } else {
                                                                                updateIncomePaycheks(assignment[count], transId);
                                                                            }
                                                                        }
                                                                    });
                                                                })
                                                            })
                                                            // })
                                                        }
                                                    })
                                                }
                                                else {
                                                    updatePlaidCollection();
                                                }

                                            }
                                            function updatePlaidCollection() {
                                                plaidCount++;
                                                let docRef = userPlaidRef.doc(plaidTransId);
                                                docRef.delete();
                                                if (plaidCount === plaidpromise.length) {
                                                    deletacc.delete();
                                                    return response.status(200).send({
                                                        success: true,
                                                        message: " Plaid transactions removed."
                                                    });
                                                }
                                                else {
                                                    unAssignTransaction(body.userId, plaidpromise[plaidCount])
                                                }
                                            }
                                        }
                                        else {
                                            //-----------------Updated Expense---------------------
                                            updatePaycheks(assignment[count], transId);
                                            function updatePaycheks(i, transId) {
                                                if (i) {
                                                    incomeRef.where("paycheckIds", "array-contains", i.paycheckId).get().then((income_snap) => {
                                                        if (income_snap.docs.length === 0) {
                                                            error.push(`paycheck id not exists: ${i.paycheckId}`);
                                                            count++;
                                                            if (count == assignment.length) {
                                                                updatePlaidCollectionExpense();
                                                            } else {
                                                                updatePaycheks(assignment[count], transId);
                                                            }
                                                        }
                                                        else {
                                                            income_snap.docs.forEach(income_data => {
                                                                const incomeSourceId = income_data.id;
                                                                const incomeSourceData = income_data.data();
                                                                let Mostrecent = [];
                                                                let paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(i.paycheckId);
                                                                paycheckGet.get().then((snapPayCheckReq) => {
                                                                    var paycheckData = snapPayCheckReq.data();
                                                                    let existingBudgetDetails = paycheckData.budgetDetails;
                                                                    let index = existingBudgetDetails.findIndex(o => (o.category) == (category));
                                                                    if (index != -1) {
                                                                        existingBudgetDetails[index].spent = existingBudgetDetails[index].spent + (-i.amount);
                                                                        existingBudgetDetails[index].available = existingBudgetDetails[index].available - (-i.amount);
                                                                        existingBudgetDetails[index].transactions = existingBudgetDetails[index].transactions.filter(o => o != transId);
                                                                    }
                                                                    var totalReceived = paycheckData.totalReceived === 0 ? paycheckData.totalExpected : paycheckData.totalReceived;
                                                                    var totalspentAmount = existingBudgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                        return a + b;
                                                                    }, 0);
                                                                    var totalBudgetAmount = paycheckData.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                        return a + b;
                                                                    }, 0);
                                                                    var totalsurplusAmount = paycheckData.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                        return a + b;
                                                                    }, 0);
                                                                    paycheckGet.update({
                                                                        budgetDetails: existingBudgetDetails,
                                                                        budgetsCurrent: totalBudgetAmount,
                                                                        budgetsToBeBudgeted: (totalReceived - totalBudgetAmount + totalsurplusAmount),
                                                                        budgetsAvailable: totalReceived - totalspentAmount + totalsurplusAmount,
                                                                        isOverbudget: (totalReceived - totalBudgetAmount + totalsurplusAmount) < 0 ? true : false,
                                                                        isOverspent: totalReceived - totalspentAmount + totalsurplusAmount < 0 ? true : false
                                                                    }).then(() => {
                                                                        incomeRef.doc(incomeSourceId).collection("paychecks").get().then((snapPaycheck) => {
                                                                            snapPaycheck.docs.filter(o => {
                                                                                if (o.data().payDateTimeStamp > paycheckData.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                                                    Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                                                                    Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                                                    return;
                                                                                }
                                                                            });
                                                                            if (Mostrecent.length) {
                                                                                let indix = Mostrecent[0].budgetDetails.findIndex(o => (o.category) == (category));
                                                                                if (indix != -1) {
                                                                                    Mostrecent[0].budgetDetails[indix].available = (Mostrecent[0].budgetDetails[indix].available + i.amount);
                                                                                    Mostrecent[0].budgetDetails[indix].budgeted = (Mostrecent[0].budgetDetails[indix].budgeted + i.amount);
                                                                                }
                                                                                let _rindex = Mostrecent[0].rolloverBudgetTemplate.findIndex(o => o.category === category);
                                                                                if (_rindex != -1) {
                                                                                    Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted = Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted + i.amount;
                                                                                    Mostrecent[0].rolloverBudgetTemplate[_rindex].available = Mostrecent[0].rolloverBudgetTemplate[_rindex].available + i.amount;
                                                                                }
                                                                                var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                                                                var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                                    return a + b;
                                                                                }, 0);
                                                                                var recentbudgetedAmount = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                                    return a + b;
                                                                                }, 0);
                                                                                var recentsurplusAmount = Mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                                    return a + b;
                                                                                }, 0);
                                                                                incomeRef.doc(incomeSourceId).collection("paychecks").doc(Mostrecent[0].id).update({
                                                                                    budgetDetails: Mostrecent[0].budgetDetails,
                                                                                    budgetsToBeBudgeted: recentReceived - recentbudgetedAmount + recentsurplusAmount,
                                                                                    budgetsCurrent: recentbudgetedAmount,
                                                                                    rolloverBudgetTemplate: Mostrecent[0].rolloverBudgetTemplate,
                                                                                    surplusBudgetTemplate: Mostrecent[0].surplusBudgetTemplate,
                                                                                    isOverbudget: (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                                                    budgetsAvailable: recentReceived - recentspentAmount + recentsurplusAmount,
                                                                                    isOverspent: (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                                                }).then(() => {
                                                                                    updateGoals(i.amount);
                                                                                }).catch(e => {
                                                                                    count++;
                                                                                    if (count === assignment.length) {
                                                                                        updatePlaidCollectionExpense();

                                                                                    } else {
                                                                                        updatePaycheks(assignment[count], transId);

                                                                                    }
                                                                                });
                                                                            }
                                                                            else {
                                                                                updateGoals(i.amount);
                                                                            }
                                                                        });
                                                                        function updateGoals(amount) {
                                                                            count++;
                                                                            goalRef.where("goal_incomeSource_Id", "==", incomeSourceId).get().then((snap) => {
                                                                                if (snap.docs.length) {
                                                                                    var increase = 0;
                                                                                    snap.docs.forEach(goal => {
                                                                                        increase++; Math.abs(i.amount)
                                                                                        if (goal.data().category_id === category_id) {
                                                                                            var goalData = goal.data();
                                                                                            if (goalData.goal_type === "saving") {
                                                                                                goalData.left_amount = goalData.left_amount + Math.abs(amount);
                                                                                                goalData.paid_amount = goalData.paid_amount - Math.abs(amount);
                                                                                                goalData.isAccomplished = (goalData.paid_amount >= goalData.goal_amount) ? true : false;
                                                                                                if (goalData.paid_amount >= goalData.goal_amount) {
                                                                                                    goalData.left_amount = 0;
                                                                                                }
                                                                                                calculateDate(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                                                                    goalData.goal_endDate = date;
                                                                                                    goalRef.doc(goal.id).update({
                                                                                                        left_amount: goalData.left_amount,
                                                                                                        paid_amount: goalData.paid_amount,
                                                                                                        goal_endDate: goalData.goal_endDate,
                                                                                                        isAccomplished: goalData.isAccomplished
                                                                                                    });
                                                                                                });
                                                                                            }
                                                                                            else {
                                                                                                goalData.left_amount = goalData.left_amount + Math.abs(amount);
                                                                                                goalData.paid_amount = goalData.paid_amount - Math.abs(amount);
                                                                                                goalData.isAccomplished = (goalData.left_amount <= 0) ? true : false;
                                                                                                if (goalData.paid_amount >= goalData.goal_amount) {
                                                                                                    goalData.left_amount = 0;
                                                                                                }
                                                                                                calculateTarget(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                                                                    goalData.goal_endDate = date;
                                                                                                    goalRef.doc(goal.id).update({
                                                                                                        left_amount: goalData.left_amount,
                                                                                                        paid_amount: goalData.paid_amount,
                                                                                                        goal_endDate: goalData.goal_endDate,
                                                                                                        isAccomplished: goalData.isAccomplished
                                                                                                    });
                                                                                                });
                                                                                            }

                                                                                        }
                                                                                    });
                                                                                    if (increase === snap.docs.length) {
                                                                                        if (count === assignment.length) {
                                                                                            updatePlaidCollectionExpense();

                                                                                        } else {
                                                                                            updatePaycheks(assignment[count], transId);

                                                                                        }
                                                                                    }
                                                                                }
                                                                                else {
                                                                                    if (count === assignment.length) {
                                                                                        updatePlaidCollectionExpense();

                                                                                    } else {
                                                                                        updatePaycheks(assignment[count], transId);

                                                                                    }
                                                                                }
                                                                            }).catch(() => {
                                                                                if (count === assignment.length) {
                                                                                    updatePlaidCollectionExpense();
                                                                                } else {
                                                                                    updatePaycheks(assignment[count], transId);
                                                                                }
                                                                            });
                                                                        }




                                                                    })
                                                                })
                                                            })

                                                        }
                                                    })
                                                }
                                                else {
                                                    updatePlaidCollectionExpense();
                                                }
                                            }

                                            function updatePlaidCollectionExpense() {
                                                plaidCount++;
                                                let docRef = userPlaidRef.doc(plaidTransId);
                                                docRef.delete();
                                                if (plaidCount === plaidpromise.length) {
                                                    deletacc.delete();
                                                    return response.status(200).send({
                                                        success: true,
                                                        message: " Plaid transactions removed."
                                                    });
                                                }
                                                else {
                                                    unAssignTransaction(body.userId, plaidpromise[plaidCount])
                                                }
                                            }
                                        }
                                    })
                                }
                                else {
                                    plaidCount++;
                                    let docRef = userPlaidRef.doc(plaidTransId);
                                    docRef.delete();
                                    if (plaidCount === plaidpromise.length) {
                                        deletacc.delete();
                                        return response.status(200).send({
                                            success: true,
                                            message: " Plaid transactions removed."
                                        });
                                    }
                                    else {
                                        unAssignTransaction(body.userId, plaidpromise[plaidCount])
                                    }

                                }
                            })
                        }
                        else {
                            plaidCount++;
                            if (plaidCount === plaidpromise.length) {
                                deletacc.delete();
                                return response.status(200).send({
                                    success: true,
                                    message: " Plaid transactions removed."
                                });
                            }
                            else {
                                unAssignTransaction(body.userId, plaidpromise[plaidCount])
                            }
                        }

                    }


                }
                else {
                    deletacc.delete();
                    return response.status(200).send({
                        success: true,
                        message: "No Plaid transactions exists"
                    });
                }
            }).catch(function (error) {
                response.status(400).send({
                    success: false,
                    error: error
                });
            });
        }

    });
});

exports.deletePlaidtransaction = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        const data = req.body;
        const plaidTransId = data.transactionId;
        let error = [];
        const plaidtransactionRef = admin.firestore().collection("user_plaid_transaction").doc(data.userId).collection("transactions").doc(data.transactionId);
        const transRef = admin.firestore().collection("user_transaction").doc(data.userId).collection("transactions");
        const incomeRef = admin.firestore().collection("income_source").doc(data.userId).collection("incomes");
        const goalRef = admin.firestore().collection("users").doc(data.userId).collection("goals");
        transRef.where("plaidTransId", "==", data.transactionId).get().then((transSnap) => {
            if (transSnap.docs.length === 0) {
                error.push(`paycheck id not exists: ${data.transactionId}`);
                plaidtransactionRef.update({ "active_transaction": false });
                return res.status(200).send({
                    success: true,
                    transaction: "Plaid transaction delete with no user transaction"
                });
            }
            else {
                transSnap.docs.forEach((user_trans, usrIndex) => {
                    const type = user_trans.data().type;
                    const assignment = user_trans.data().assignment;
                    const category = user_trans.data().category;
                    const category_id = user_trans.data().category_id;
                    const transId = user_trans.id;
                    transRef.doc(transId).delete();
                    var count = 0;
                    if (type == "income") {
                        updateIncomePaycheks(assignment[count], user_trans.id);
                        function updateIncomePaycheks(i, transId) {
                            if (i) {
                                incomeRef.where("paycheckIds", "array-contains", i.paycheckId).get().then((income_snap) => {
                                    if (income_snap.docs.length === 0) {
                                        error.push(`paycheck id not exists: ${i.paycheckId}`);
                                        count++;
                                        if (count == assignment.length) {
                                            // update Plaid Trans
                                            updatePlaidCollection();
                                        }
                                        else {
                                            updateIncomePaycheks(assignment[count], transId);
                                        }
                                    }
                                    else {
                                        const incomeSourceId = income_snap.docs[0].id;
                                        const incomeSourceData = income_snap.docs[0].data();
                                        let Mostrecent = [];
                                        let paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(i.paycheckId);
                                        paycheckGet.get().then((snapPayCheckReq) => {
                                            var paycheckData = snapPayCheckReq.data();
                                            let updatedTransIds = paycheckData.receivedPaycheckTransaction.filter(o => o != transId);
                                            var totalspentAmount = paycheckData.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                return a + b;
                                            }, 0);
                                            var totalBudgetAmount = paycheckData.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                return a + b;
                                            }, 0);
                                            var totalReceived = ((paycheckData.totalReceived - Math.abs(i.amount)) === 0 ? paycheckData.totalExpected : paycheckData.totalReceived - Math.abs(i.amount))
                                            var totalsurplusBudgetTemplate = paycheckData.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                return a + b;
                                            }, 0);
                                            paycheckGet.update({
                                                totalReceived: admin.firestore.FieldValue.increment(- Math.abs(i.amount)),
                                                receivedPaycheckTransaction: updatedTransIds,
                                                budgetsCurrent: totalBudgetAmount,
                                                budgetsToBeBudgeted: (totalReceived - totalBudgetAmount + totalsurplusBudgetTemplate),
                                                budgetsAvailable: totalReceived - totalspentAmount + totalsurplusBudgetTemplate,
                                                isOverbudget: (totalReceived - totalBudgetAmount + totalsurplusBudgetTemplate) < 0 ? true : false,
                                                isOverspent: totalReceived - totalspentAmount + totalsurplusBudgetTemplate < 0 ? true : false
                                            }).then(() => {
                                                incomeRef.doc(incomeSourceId).collection("paychecks").get().then((query) => {
                                                    query.docs.filter(o => {
                                                        if (o.data().payDateTimeStamp > paycheckData.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                            Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                                            Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                            return;
                                                        }
                                                    })
                                                    if (Mostrecent.length) {
                                                        var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                                        var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                            return a + b;
                                                        }, 0);
                                                        var recentBudgetedAmount = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                            return a + b;
                                                        }, 0);
                                                        var recentsurplusAmount = Mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                            return a + b;
                                                        }, 0);
                                                        incomeRef.doc(incomeSourceId).collection("paychecks").doc(Mostrecent[0].id).update({
                                                            "surplusBudgetTemplate": Mostrecent[0].surplusBudgetTemplate,
                                                            "budgetsCurrent": recentBudgetedAmount,
                                                            "budgetsToBeBudgeted": (recentReceived - recentBudgetedAmount + recentsurplusAmount),
                                                            "isOverbudget": (recentReceived - recentBudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                            "budgetsAvailable": recentReceived - recentspentAmount + recentsurplusAmount,
                                                            "isOverspent": (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                        }).then(() => {
                                                            count++;
                                                            if (count === assignment.length) {
                                                                updatePlaidCollection();
                                                            } else {
                                                                updateIncomePaycheks(assignment[count], transId);
                                                            }
                                                        }).catch(err => {
                                                            count++;
                                                            if (count === assignment.length) {
                                                                updatePlaidCollection();
                                                            } else {
                                                                updateIncomePaycheks(assignment[count], transId);
                                                            }
                                                        });
                                                    }
                                                    else {
                                                        count++;
                                                        if (count === assignment.length) {
                                                            updatePlaidCollection();
                                                        } else {
                                                            updateIncomePaycheks(assignment[count], transId);
                                                        }
                                                    }
                                                });
                                            })
                                        })
                                        // })
                                    }
                                })
                            }
                            else {
                                updatePlaidCollection();
                            }
                        }
                        function updatePlaidCollection() {
                            plaidtransactionRef.update({ "active_transaction": false });
                            if (usrIndex === transSnap.docs.length - 1) {
                                return res.status(200).send({
                                    success: true,
                                    transaction: "Plaid Unassigned"
                                });
                            }
                        }
                    }
                    else {
                        //-----------------Updated Expense---------------------
                        updatePaycheks(assignment[count], transId);
                        function updatePaycheks(i, transId) {
                            if (i) {
                                incomeRef.where("paycheckIds", "array-contains", i.paycheckId).get().then((income_snap) => {
                                    if (income_snap.docs.length === 0) {
                                        error.push(`paycheck id not exists: ${i.paycheckId}`);
                                        count++;
                                        if (count == assignment.length) {
                                            updatePlaidCollectionExpense();
                                        } else {
                                            updatePaycheks(assignment[count], transId);
                                        }
                                    }
                                    else {
                                        income_snap.docs.forEach(income_data => {
                                            const incomeSourceId = income_data.id;
                                            const incomeSourceData = income_data.data();
                                            let Mostrecent = [];
                                            let paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(i.paycheckId);
                                            paycheckGet.get().then((snapPayCheckReq) => {
                                                var paycheckData = snapPayCheckReq.data();
                                                let existingBudgetDetails = paycheckData.budgetDetails;
                                                let index = existingBudgetDetails.findIndex(o => (o.category) == (category));
                                                if (index != -1) {
                                                    existingBudgetDetails[index].spent = existingBudgetDetails[index].spent + (-i.amount);
                                                    existingBudgetDetails[index].available = existingBudgetDetails[index].available - (-i.amount);
                                                    existingBudgetDetails[index].transactions = existingBudgetDetails[index].transactions.filter(o => o != transId);
                                                }
                                                var totalReceived = paycheckData.totalReceived === 0 ? paycheckData.totalExpected : paycheckData.totalReceived;
                                                var totalspentAmount = existingBudgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                var totalBudgetAmount = existingBudgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                var totalsurplusAmount = paycheckData.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                paycheckGet.update({
                                                    budgetDetails: existingBudgetDetails,
                                                    budgetsCurrent: totalBudgetAmount,
                                                    budgetsToBeBudgeted: (totalReceived - totalBudgetAmount + totalsurplusAmount),
                                                    budgetsAvailable: totalReceived - totalspentAmount + totalsurplusAmount,
                                                    isOverbudget: (totalReceived - totalBudgetAmount + totalsurplusAmount) < 0 ? true : false,
                                                    isOverspent: (totalReceived - totalspentAmount + totalsurplusAmount) < 0 ? true : false
                                                }).then(() => {
                                                    incomeRef.doc(incomeSourceId).collection("paychecks").get().then((snapPaycheck) => {
                                                        snapPaycheck.docs.filter(o => {
                                                            if (o.data().payDateTimeStamp > paycheckData.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                                Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                                                Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                                return;
                                                            }
                                                        });
                                                        if (Mostrecent.length) {
                                                            let indix = Mostrecent[0].budgetDetails.findIndex(o => (o.category) == (category));
                                                            if (indix != -1) {
                                                                Mostrecent[0].budgetDetails[indix].available = (Mostrecent[0].budgetDetails[indix].available + i.amount);
                                                                Mostrecent[0].budgetDetails[indix].budgeted = (Mostrecent[0].budgetDetails[indix].budgeted + i.amount);
                                                            }
                                                            let _rindex = Mostrecent[0].rolloverBudgetTemplate.findIndex(o => o.category === category);
                                                            if (_rindex != -1) {
                                                                Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted = Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted + i.amount;
                                                                Mostrecent[0].rolloverBudgetTemplate[_rindex].available = Mostrecent[0].rolloverBudgetTemplate[_rindex].available + i.amount;
                                                            }
                                                            var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                                            var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                return a + b;
                                                            }, 0);
                                                            var recentBudgetAmount = existingBudgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                return a + b;
                                                            }, 0);
                                                            var recentsurplusAmount = Mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                return a + b;
                                                            }, 0);
                                                            incomeRef.doc(incomeSourceId).collection("paychecks").doc(Mostrecent[0].id).update({
                                                                budgetDetails: Mostrecent[0].budgetDetails,
                                                                budgetsToBeBudgeted: recentReceived - recentBudgetAmount + recentsurplusAmount,
                                                                budgetsCurrent: recentBudgetAmount,
                                                                rolloverBudgetTemplate: Mostrecent[0].rolloverBudgetTemplate,
                                                                surplusBudgetTemplate: Mostrecent[0].surplusBudgetTemplate,
                                                                isOverbudget: (recentReceived - recentBudgetAmount + recentsurplusAmount) < 0 ? true : false,
                                                                budgetsAvailable: recentReceived - recentspentAmount + recentsurplusAmount,
                                                                isOverspent: (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                            }).then(() => {
                                                                updateGoals(i.amount);
                                                            }).catch(e => {
                                                                count++;
                                                                if (count === assignment.length) {
                                                                    updatePlaidCollectionExpense();

                                                                } else {
                                                                    updatePaycheks(assignment[count], transId);

                                                                }
                                                            });
                                                        }
                                                        else {
                                                            updateGoals(i.amount);
                                                        }
                                                    });
                                                    function updateGoals(amount) {
                                                        count++;
                                                        goalRef.where("goal_incomeSource_Id", "==", incomeSourceId).get().then((snap) => {
                                                            if (snap.docs.length) {
                                                                var increase = 0;
                                                                snap.docs.forEach(goal => {
                                                                    increase++; Math.abs(i.amount)
                                                                    if (goal.data().category_id === category_id) {
                                                                        var goalData = goal.data();
                                                                        if (goalData.goal_type === "saving") {
                                                                            goalData.left_amount = goalData.left_amount + Math.abs(amount);
                                                                            goalData.paid_amount = goalData.paid_amount - Math.abs(amount);
                                                                            goalData.isAccomplished = (goalData.paid_amount >= goalData.goal_amount) ? true : false;
                                                                            if (goalData.paid_amount >= goalData.goal_amount) {
                                                                                goalData.left_amount = 0;
                                                                            }
                                                                            calculateDate(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                                                goalData.goal_endDate = date;
                                                                                goalRef.doc(goal.id).update({
                                                                                    left_amount: goalData.left_amount,
                                                                                    paid_amount: goalData.paid_amount,
                                                                                    goal_endDate: goalData.goal_endDate,
                                                                                    isAccomplished: goalData.isAccomplished
                                                                                });
                                                                            });
                                                                        }
                                                                        else {
                                                                            goalData.left_amount = goalData.left_amount + Math.abs(amount);
                                                                            goalData.paid_amount = goalData.paid_amount - Math.abs(amount);
                                                                            goalData.isAccomplished = (goalData.paid_amount >= goalData.goal_amount) ? true : false;
                                                                            if (goalData.paid_amount >= goalData.goal_amount) {
                                                                                goalData.left_amount = 0;
                                                                            }
                                                                            calculateTarget(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                                                goalData.goal_endDate = date;
                                                                                goalRef.doc(goal.id).update({
                                                                                    left_amount: goalData.left_amount,
                                                                                    paid_amount: goalData.paid_amount,
                                                                                    goal_endDate: goalData.goal_endDate,
                                                                                    isAccomplished: goalData.isAccomplished
                                                                                });
                                                                            });
                                                                        }

                                                                    }
                                                                });
                                                                if (increase === snap.docs.length) {
                                                                    if (count === assignment.length) {
                                                                        updatePlaidCollectionExpense();

                                                                    } else {
                                                                        updatePaycheks(assignment[count], transId);

                                                                    }
                                                                }
                                                            }
                                                            else {
                                                                if (count === assignment.length) {
                                                                    updatePlaidCollectionExpense();

                                                                } else {
                                                                    updatePaycheks(assignment[count], transId);

                                                                }
                                                            }
                                                        }).catch(e => {
                                                            if (count === assignment.length) {
                                                                updatePlaidCollectionExpense();

                                                            } else {
                                                                updatePaycheks(assignment[count], transId);

                                                            }
                                                        });
                                                    }
                                                })
                                            })
                                        })

                                    }
                                })

                            } else {
                                updatePlaidCollectionExpense();
                            }
                        }

                        function updatePlaidCollectionExpense() {
                            plaidtransactionRef.update({ "active_transaction": false });
                            if (usrIndex === transSnap.docs.length - 1) {
                                return res.status(200).send({
                                    success: true,
                                    transaction: "Plaid Unassigned"
                                });
                            }
                        }
                    }
                })
            }
        })
    });

});

exports.exchangeToken = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        // Ray-Changes
        // client.exchangePublicToken(request.body.public_token, function (error, tokenResponse) {
        client.itemPublicTokenExchange(request.body.public_token, function (error, tokenResponse) {
            if (error != null) {
                console.log('Could not exchange public_token!' + '\n' + error);
                return response.status(400).send({ success: false, error: error });
            }
            response.status(200).send({
                success: true,
                access_token: tokenResponse.access_token,
                item_id: tokenResponse.item_id
            });
        });
    });
});

exports.getAccountsfromPlaid = functions.https.onRequest((request, response) => {
    cors(request, response, async () => {
        const body = request.body;
        // Ray-Changes
        // client.getAccounts(body.access_token, function (error, results) {
        client.accountsGet(body.access_token, function (error, results) {
            if (error != null) {
                console.log('Could not exchange public_token!' + '\n' + error);
                return response.status(400).send({ success: false, error: error });
            }
            response.status(200).send({
                success: true,
                accounts: results.accounts,
            });
        });
    });
});

exports.unAssignTransaction = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        const data = req.body;
        let type = "";
        let assignment = [];
        let plaidTransId = "";
        let transId = data.transactionId; const error = [];
        const transRef = admin.firestore().collection("user_transaction").doc(data.userId).collection("transactions").doc(data.transactionId);
        const goalRef = admin.firestore().collection("users").doc(data.userId).collection("goals");
        const incomeRef = admin.firestore().collection("income_source").doc(data.userId).collection("incomes");
        transRef.get().then((snapTrans) => {
            if (snapTrans.exists) {
                const user_trans = snapTrans.data();
                type = user_trans.type;
                assignment = user_trans.assignment;
                const category = user_trans.category;
                const category_id = user_trans.category_id;
                plaidTransId = user_trans.plaidTransId;
                let count = 0;
                if (type == "income") {
                    updateIncomePaycheks(assignment[count], user_trans.id);
                    function updateIncomePaycheks(i, transId) {
                        incomeRef.where("paycheckIds", "array-contains", i.paycheckId).get().then((income_snap) => {
                            if (income_snap.docs.length === 0) {
                                error.push(`paycheck id not exists: ${i.paycheckId}`);
                                count++;
                                if (count == assignment.length) {
                                    // update Plaid Trans
                                    updatePlaidCollection();
                                }
                                else {
                                    updateIncomePaycheks(assignment[count], transId);
                                }
                            }
                            else {
                                const incomeSourceId = income_snap.docs[0].id;
                                const incomeSourceData = income_snap.docs[0].data();
                                let Mostrecent = [];
                                let paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(i.paycheckId);
                                paycheckGet.get().then((snapPayCheckReq) => {
                                    var paycheckData = snapPayCheckReq.data();
                                    let updatedTransIds = paycheckData.receivedPaycheckTransaction.filter(o => o != transId);
                                    var totalspentAmount = paycheckData.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    var totalBudgetAmount = paycheckData.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    var totalReceived = ((paycheckData.totalReceived - Math.abs(i.amount)) === 0 ? paycheckData.totalExpected : (paycheckData.totalReceived - Math.abs(i.amount)))
                                    var totalsurplusBudgetTemplate = paycheckData.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    paycheckGet.update({
                                        totalReceived: admin.firestore.FieldValue.increment(- Math.abs(i.amount)),
                                        receivedPaycheckTransaction: updatedTransIds,
                                        budgetsCurrent: totalBudgetAmount,
                                        budgetsToBeBudgeted: (totalReceived - totalBudgetAmount + totalsurplusBudgetTemplate),
                                        budgetsAvailable: totalReceived - totalspentAmount + totalsurplusBudgetTemplate,
                                        isOverbudget: (totalReceived - totalBudgetAmount + totalsurplusBudgetTemplate) < 0 ? true : false,
                                        isOverspent: totalReceived - totalspentAmount + totalsurplusBudgetTemplate < 0 ? true : false
                                    }).then(() => {
                                        incomeRef.doc(incomeSourceId).collection("paychecks").get().then((query) => {
                                            query.docs.filter(o => {
                                                if (o.data().payDateTimeStamp > paycheckData.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                    Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                                    Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                    return;
                                                }
                                            })
                                            if (Mostrecent.length) {
                                                var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                                var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                var recentbudgetedAmount = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                var recentsurplusAmount = Mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                incomeRef.doc(incomeSourceId).collection("paychecks").doc(Mostrecent[0].id).update({
                                                    "surplusBudgetTemplate": Mostrecent[0].surplusBudgetTemplate,
                                                    "budgetsCurrent": recentbudgetedAmount,
                                                    "budgetsToBeBudgeted": (recentReceived - recentbudgetedAmount + recentsurplusAmount),
                                                    "isOverbudget": (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                    "budgetsAvailable": recentReceived - recentspentAmount + recentsurplusAmount,
                                                    "isOverspent": (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                }).then(() => {
                                                    count++;
                                                    if (count === assignment.length) {
                                                        updatePlaidCollection();
                                                    } else {
                                                        updateIncomePaycheks(assignment[count], transId);
                                                    }
                                                }).catch(e => {
                                                    count++;
                                                    if (count === assignment.length) {
                                                        updatePlaidCollection();
                                                    } else {
                                                        updateIncomePaycheks(assignment[count], transId);
                                                    }
                                                });
                                            }
                                            else {
                                                count++;
                                                if (count === assignment.length) {
                                                    updatePlaidCollection();
                                                } else {
                                                    updateIncomePaycheks(assignment[count], transId);
                                                }
                                            }
                                        });
                                    })
                                })
                                // })
                            }
                        })
                    }
                    function updatePlaidCollection() {
                        transRef.delete();
                        if (plaidTransId && plaidTransId != "") {
                            let query = admin.firestore().collection("user_plaid_transaction").doc(data.userId).collection("transactions").doc(plaidTransId);
                            query.get().then((plaidSnap) => {
                                const plaidData = plaidSnap.data();
                                var sum = assignment.map(o => o.amount).reduce(function (a, b) {
                                    return a + b;
                                }, 0);

                                var paychecksIds = assignment.map(o => o.paycheckId);
                                let updatedIds = plaidData.assignment ? plaidData.assignment.filter(function (obj) { return paychecksIds.indexOf(obj) == -1; }) : [];
                                let remainAmount = plaidData.remainingAmount + Math.abs(sum);
                                query.update({
                                    remainingAmount: remainAmount,
                                    status: (remainAmount == 0) ? "Completed" : "Partially",
                                    assignment: updatedIds
                                }).then(() => {
                                    return res.status(200).send({
                                        success: true,
                                        transaction: "Plaid"
                                    });
                                });
                            });
                        } else {
                            return res.status(200).send({
                                success: true,
                                transaction: "Manual"
                            });
                        }
                    }
                }
                else {
                    //-----------------Updated Expense---------------------
                    updatePaycheks(assignment[count], transId);
                    function updatePaycheks(i, transId) {
                        incomeRef.where("paycheckIds", "array-contains", i.paycheckId).get().then((income_snap) => {
                            if (income_snap.docs.length === 0) {
                                error.push(`paycheck id not exists: ${i.paycheckId}`);
                                count++;
                                if (count == assignment.length) {
                                    updatePlaidCollectionExpense();
                                } else {
                                    updatePaycheks(assignment[count], transId);
                                }
                            }
                            else {
                                income_snap.docs.forEach(income_data => {
                                    const incomeSourceId = income_data.id;
                                    const incomeSourceData = income_data.data();
                                    let Mostrecent = [];
                                    let paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(i.paycheckId);
                                    paycheckGet.get().then((snapPayCheckReq) => {
                                        var paycheckData = snapPayCheckReq.data();
                                        let existingBudgetDetails = paycheckData.budgetDetails;
                                        let index = existingBudgetDetails.findIndex(o => (o.category) == (category));
                                        if (index != -1) {
                                            existingBudgetDetails[index].spent = existingBudgetDetails[index].spent + (-i.amount);
                                            existingBudgetDetails[index].available = existingBudgetDetails[index].available - (-i.amount);
                                            if (existingBudgetDetails[index].transactions && existingBudgetDetails[index].transactions.length) {
                                                existingBudgetDetails[index].transactions = existingBudgetDetails[index].transactions.filter(o => o != transId)
                                            } else {
                                                existingBudgetDetails[index].transactions = [];
                                            }
                                        }
                                        var totalReceived = paycheckData.totalReceived === 0 ? paycheckData.totalExpected : paycheckData.totalReceived;
                                        var totalspentAmount = existingBudgetDetails.map(o => o.spent).reduce(function (a, b) {
                                            return a + b;
                                        }, 0);
                                        var totalbudgetedAmount = existingBudgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                            return a + b;
                                        }, 0);
                                        var totalsurplusAmount = paycheckData.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                            return a + b;
                                        }, 0);
                                        paycheckGet.update({
                                            budgetDetails: existingBudgetDetails,
                                            budgetsCurrent: totalbudgetedAmount,
                                            budgetsToBeBudgeted: totalReceived - totalbudgetedAmount + totalsurplusAmount,
                                            isOverbudget: (totalReceived - totalbudgetedAmount + totalsurplusAmount) < 0 ? true : false,
                                            budgetsAvailable: totalReceived - totalspentAmount + totalsurplusAmount,
                                            isOverspent: (totalReceived - totalspentAmount + totalsurplusAmount) < 0 ? true : false
                                        }).then(() => {
                                            incomeRef.doc(incomeSourceId).collection("paychecks").get().then((snapPaycheck) => {
                                                snapPaycheck.docs.filter(o => {
                                                    if (o.data().payDateTimeStamp > paycheckData.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                        Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                                        Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                        return;
                                                    }
                                                });
                                                if (Mostrecent.length) {
                                                    let indix = Mostrecent[0].budgetDetails.findIndex(o => (o.category) == (category));
                                                    if (indix != -1) {
                                                        Mostrecent[0].budgetDetails[indix].available = (Mostrecent[0].budgetDetails[indix].available + i.amount);
                                                        Mostrecent[0].budgetDetails[indix].budgeted = (Mostrecent[0].budgetDetails[indix].budgeted + i.amount);
                                                    }
                                                    let _rindex = Mostrecent[0].rolloverBudgetTemplate.findIndex(o => o.category == category);
                                                    if (_rindex != -1) {
                                                        Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted = Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted + i.amount;
                                                        Mostrecent[0].rolloverBudgetTemplate[_rindex].available = Mostrecent[0].rolloverBudgetTemplate[_rindex].available + i.amount;
                                                    }
                                                    var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                                    var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                        return a + b;
                                                    }, 0);
                                                    var recentbudgetedAmount = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                        return a + b;
                                                    }, 0);
                                                    var recentsurplusAmount = Mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                        return a + b;
                                                    }, 0);
                                                    incomeRef.doc(incomeSourceId).collection("paychecks").doc(Mostrecent[0].id).update({
                                                        budgetDetails: Mostrecent[0].budgetDetails,
                                                        budgetsToBeBudgeted: recentReceived - recentbudgetedAmount + recentsurplusAmount,
                                                        budgetsCurrent: recentbudgetedAmount,
                                                        rolloverBudgetTemplate: Mostrecent[0].rolloverBudgetTemplate,
                                                        surplusBudgetTemplate: Mostrecent[0].surplusBudgetTemplate,
                                                        isOverbudget: (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                        budgetsAvailable: recentReceived - recentspentAmount + recentsurplusAmount,
                                                        isOverspent: (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                    }).then(() => {
                                                        updateGoals(i.amount);
                                                    }).catch(e => {
                                                        count++;
                                                        if (count === assignment.length) {
                                                            updatePlaidCollectionExpense();

                                                        } else {
                                                            updatePaycheks(assignment[count], transId);

                                                        }
                                                    });
                                                }
                                                else {
                                                    updateGoals(i.amount);
                                                }
                                            });
                                            function updateGoals(amount) {
                                                count++;
                                                goalRef.where("goal_incomeSource_Id", "==", incomeSourceId).get().then((snap) => {
                                                    if (snap.docs.length) {
                                                        var increase = 0;
                                                        snap.docs.forEach(goal => {
                                                            increase++;
                                                            if (goal.data().category_id === category_id) {
                                                                var goalData = goal.data();
                                                                if (goalData.goal_type === "saving") {
                                                                    goalData.left_amount = goalData.left_amount + Math.abs(amount);
                                                                    goalData.paid_amount = goalData.paid_amount - Math.abs(amount);
                                                                    goalData.isAccomplished = (goalData.paid_amount >= goalData.goal_amount) ? true : false;
                                                                    if (goalData.paid_amount >= goalData.goal_amount) {
                                                                        goalData.left_amount = 0;
                                                                    }
                                                                    calculateDate(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                                        goalData.goal_endDate = date;
                                                                        goalRef.doc(goal.id).update({
                                                                            left_amount: goalData.left_amount,
                                                                            paid_amount: goalData.paid_amount,
                                                                            goal_endDate: goalData.goal_endDate,
                                                                            isAccomplished: goalData.isAccomplished
                                                                        });
                                                                    });
                                                                }
                                                                else {
                                                                    goalData.left_amount = goalData.left_amount + Math.abs(amount);
                                                                    goalData.paid_amount = goalData.paid_amount - Math.abs(amount);
                                                                    goalData.isAccomplished = (goalData.paid_amount >= goalData.goal_amount) ? true : false;
                                                                    if (goalData.paid_amount >= goalData.goal_amount) {
                                                                        goalData.left_amount = 0;
                                                                    }
                                                                    calculateTarget(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                                        goalData.goal_endDate = date;
                                                                        goalRef.doc(goal.id).update({
                                                                            left_amount: goalData.left_amount,
                                                                            paid_amount: goalData.paid_amount,
                                                                            goal_endDate: goalData.goal_endDate,
                                                                            isAccomplished: goalData.isAccomplished
                                                                        });
                                                                    });
                                                                }
                                                            }
                                                            if (increase === snap.docs.length) {
                                                                if (count === assignment.length) {
                                                                    updatePlaidCollectionExpense();

                                                                } else {
                                                                    updatePaycheks(assignment[count], transId);

                                                                }
                                                            }
                                                        });

                                                    }
                                                    else {
                                                        if (count === assignment.length) {
                                                            updatePlaidCollectionExpense();

                                                        } else {
                                                            updatePaycheks(assignment[count], transId);

                                                        }
                                                    }
                                                });
                                            }
                                        })
                                    })
                                })

                            }
                        })
                    }

                    function updatePlaidCollectionExpense() {
                        transRef.delete();
                        if (plaidTransId && plaidTransId != "") {
                            let query = admin.firestore().collection("user_plaid_transaction").doc(data.userId).collection("transactions").doc(plaidTransId);
                            query.get().then((plaidSnap) => {
                                const plaidData = plaidSnap.data();
                                var sum = assignment.map(o => o.amount).reduce(function (a, b) {
                                    return a + b;
                                }, 0);

                                var paychecksIds = assignment.map(o => o.paycheckId);
                                let updatedIds = plaidData.assignment ? plaidData.assignment.filter(function (obj) { return paychecksIds.indexOf(obj) == -1; }) : [];
                                let remainAmount = plaidData.remainingAmount + Math.abs(sum);
                                query.update({
                                    remainingAmount: remainAmount,
                                    status: (remainAmount == 0) ? "Completed" : "Partially",
                                    assignment: updatedIds
                                }).then(() => {
                                    return res.status(200).send({
                                        success: true,
                                        transaction: "Plaid"
                                    });
                                });



                            });
                        } else {

                            return res.status(200).send({
                                success: true,
                                transaction: "Manual"
                            });
                        }
                    }
                }
            }
            else {
                res.status(400).send({
                    success: false,
                    logLevel: 1,
                    error: "no record found for this transaction Id."
                });
            }
        }).catch(function (error) {
            res.status(400).send({
                success: false,
                logLevel: 1,
                error: JSON.stringify(error)
            });
        });

    });
});

exports.autoAssignEngine = functions.runWith(runtimeOpts).https.onRequest((req, res) => {
    cors(req, res, () => {
        const userId = req.body.userId;
        const bankType = req.body.bankType;
        const trans = req.body.transaction;
        console.log(trans.updatedTransaction);
        let incomeRef = admin.firestore().collection("income_source").doc(userId).collection("incomes");
        let usrtransRef = admin.firestore().collection("user_transaction").doc(userId).collection("transactions");
        let plaidtransRef = admin.firestore().collection("user_plaid_transaction").doc(userId).collection("transactions");
        if (trans) {
            const remainingAmount = trans.remainingAmount != undefined ? trans.remainingAmount : trans.amount;
            console.log(remainingAmount);
            if (remainingAmount < 0 && bankType === "credit") {
                return res.status(200).send({
                    success: true
                });
            }
            else {
                incomeRef.get().then((incomeSnap) => {
                    if (incomeSnap.docs.length) {
                        var iCount = 0;
                        var paycheckArray = [];
                        var Mostrecent = [];
                        incomeSnap.docs.forEach(incomeELe => {
                            const incomeSourceData = incomeELe.data();
                            incomeRef.doc(incomeELe.id).collection("paychecks").get().then((paycheckSnap) => {
                                iCount++;
                                paycheckSnap.docs.forEach((paycheckEle, _indexP) => {
                                    paycheckArray.push(Object.assign({ "income_id": incomeELe.id }, { "income_name": incomeELe.data().name },
                                        { "income_isRepeating": incomeELe.data().isRepeating }, { "income_budgetTemplate": incomeELe.data().budgetTemplate },
                                        { "id": paycheckEle.id }, paycheckEle.data()));
                                    if (iCount === incomeSnap.docs.length && (paycheckSnap.docs.length - 1 === _indexP)) {
                                        paycheckArray.filter(o => {
                                            if (o.payDateTimeStamp <= (new Date().getTime()) && (o.payDateTimeStamp <= (new Date(trans.date).getTime()))) {
                                                Mostrecent.push(o);
                                                Mostrecent = Mostrecent.sort(function (a, b) { return b.payDateTimeStamp - a.payDateTimeStamp })
                                                return;
                                            }
                                        });
                                        if (Mostrecent.length) {
                                            trans.category = trans.category ? trans.category : ["miscellaneous"];
                                            let category;
                                            for (var i = 0; i < trans.category.length; i++) {
                                                category = i == 0 ? trans.category[i] : category + " " + trans.category[i];
                                            }
                                            const remainingAmount = trans.remainingAmount != undefined ? trans.remainingAmount : trans.amount;
                                            const categoryName = category;
                                            var d = Object.assign({ "remainingAmount": remainingAmount }, { "categoryName": categoryName }, trans);
                                            usrtransRef.add({
                                                "name": trans.name,
                                                "category": categoryName,
                                                "category_id": trans.category_id,
                                                "transactionDateTime": trans.date ? new Date(trans.date) : new Date(),
                                                "transactionDateTimeStamp": trans.date ? new Date(trans.date).getTime() : new Date().getTime(),
                                                "amount": remainingAmount,
                                                "assignment": [{ amount: remainingAmount, paycheckId: Mostrecent[0].id }],
                                                "plaidTransId": trans.transaction_id,
                                                "type": (remainingAmount < 0) ? "income" : "expense"
                                            }).then(function (transResult) {
                                                console.log("transaction is added")
                                                plaidtransRef.doc(trans.transaction_id).update({
                                                    remainingAmount: 0,
                                                    status: "Completed",
                                                    assignment: [Mostrecent[0].id]
                                                }).then(() => {
                                                    console.log("assigment is processing...")
                                                    assignplaidTransaction({ "transaction": d, "paycheck": Mostrecent[0] }, userId, transResult.id);
                                                }).catch(err => {
                                                    console.log(JSON.stringify(err))
                                                    return res.status(200).send({
                                                        success: true
                                                    });
                                                });
                                                function assignplaidTransaction(params, userId, usrTrnsId) {
                                                    const addedTransactionId = usrTrnsId;
                                                    let incomeRef = admin.firestore().collection("income_source").doc(userId).collection("incomes");
                                                    var remainAmount = params.transaction.remainingAmount;
                                                    //--------------------------income----------------------------
                                                    if (params.transaction.remainingAmount < 0) {
                                                        const incomeSourceId = params.paycheck.income_id;
                                                        let paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(params.paycheck.id);
                                                        var paycheckData = params.paycheck;
                                                        var totalReceived = paycheckData.totalReceived === 0 ? Math.abs(remainAmount) : paycheckData.totalReceived + Math.abs(remainAmount)
                                                        var totalspentAmount = paycheckData.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                            return a + b;
                                                        }, 0);
                                                        var totalBudgetAmount = paycheckData.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                            return a + b;
                                                        }, 0);
                                                        var totalsurplusAmount = paycheckData.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                            return a + b;
                                                        }, 0);
                                                        paycheckGet.update({
                                                            totalReceived: admin.firestore.FieldValue.increment(Math.abs(remainAmount)),
                                                            receivedPaycheckTransaction: admin.firestore.FieldValue.arrayUnion(usrTrnsId),
                                                            budgetsAvailable: Math.abs(totalReceived) - totalspentAmount + totalsurplusAmount,
                                                            budgetsToBeBudgeted: Math.abs(totalReceived) - totalBudgetAmount + totalsurplusAmount,
                                                            budgetsCurrent: totalBudgetAmount,
                                                            isOverbudget: (Math.abs(totalReceived) - totalBudgetAmount + totalsurplusAmount) < 0 ? true : false,
                                                            isOverspent: (Math.abs(totalReceived) - totalspentAmount + totalsurplusAmount) < 0 ? true : false
                                                        }).then(() => {
                                                            let recentPaycheck = [];
                                                            incomeRef.doc(incomeSourceId).collection("paychecks").get().then((query) => {
                                                                query.docs.filter(o => {
                                                                    if (o.data().payDateTimeStamp > paycheckData.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                                        recentPaycheck.push(Object.assign({ id: o.id }, o.data()));
                                                                        recentPaycheck = recentPaycheck.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                                        return;
                                                                    }
                                                                });
                                                                if (recentPaycheck.length) {
                                                                    var surplusBudgetTemplate = [];
                                                                    surplusBudgetTemplate = recentPaycheck[0].surplusBudgetTemplate;
                                                                    var recentReceived = Math.abs(recentPaycheck[0].totalReceived === 0 ? recentPaycheck[0].totalExpected : recentPaycheck[0].totalReceived);
                                                                    var recentspentAmount = recentPaycheck[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                        return a + b;
                                                                    }, 0);
                                                                    var recentbudgetedAmount = recentPaycheck[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                        return a + b;
                                                                    }, 0);
                                                                    var recentsurplusAmount = surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                        return a + b;
                                                                    }, 0);
                                                                    incomeRef.doc(incomeSourceId).collection("paychecks").doc(recentPaycheck[0].id).update({
                                                                        "surplusBudgetTemplate": surplusBudgetTemplate,
                                                                        "budgetsCurrent": recentbudgetedAmount,
                                                                        "budgetsToBeBudgeted": recentReceived - recentbudgetedAmount + recentsurplusAmount,
                                                                        "isOverbudget": (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                                        "budgetsAvailable": recentReceived - recentspentAmount + recentsurplusAmount,
                                                                        "isOverspent": (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                                    }).then(() => {
                                                                        console.log("updated income sources >>>>>>");
                                                                        return res.status(200).send({
                                                                            success: true
                                                                        });
                                                                    }).catch((err) => {
                                                                        console.log("error income sources >>>>>>", JSON.stringify(err));
                                                                        return res.status(200).send({
                                                                            success: true
                                                                        });
                                                                    });
                                                                }
                                                                else {
                                                                    console.log("no recent paycheck income sources >>>>>>");
                                                                    return res.status(200).send({
                                                                        success: true
                                                                    });
                                                                }
                                                            }).catch((error) => {
                                                                console.log("error income sources >>>>>>", JSON.stringify(error));
                                                                return res.status(200).send({
                                                                    success: true
                                                                });
                                                            })

                                                        }).catch((error) => {
                                                            console.log("error income sources >>>>>>", JSON.stringify(error));
                                                            return res.status(200).send({
                                                                success: true
                                                            });
                                                        })
                                                    }
                                                    //-----------------Expense---------------------
                                                    else {
                                                        console.log("expense");
                                                        const incomeSourceId = params.paycheck.income_id;
                                                        let paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(params.paycheck.id);
                                                        var paycheckData = params.paycheck;
                                                        var existingBudgetDetails = paycheckData.budgetDetails;
                                                        let index = existingBudgetDetails.findIndex(o => o.category === params.transaction.categoryName);
                                                        if (index != -1) {
                                                            existingBudgetDetails[index].spent = existingBudgetDetails[index].spent + Math.abs(remainAmount);
                                                            existingBudgetDetails[index].available = existingBudgetDetails[index].available - Math.abs(remainAmount);
                                                            if (existingBudgetDetails[index].transactions && existingBudgetDetails[index].transactions.length) {
                                                                existingBudgetDetails[index].transactions.push(addedTransactionId);
                                                            }
                                                            else {
                                                                existingBudgetDetails[index].transactions = [addedTransactionId]
                                                            }
                                                        }
                                                        else {
                                                            existingBudgetDetails.push({
                                                                "category": params.transaction.categoryName,
                                                                "category_id": params.transaction.category_id,
                                                                "budgeted": 0,
                                                                "spent": remainAmount,
                                                                "available": -remainAmount,
                                                                "transactions": [addedTransactionId]
                                                            })
                                                        }
                                                        var totalReceived = paycheckData.totalReceived === 0 ? paycheckData.totalExpected : paycheckData.totalReceived;
                                                        var totalspentAmount = existingBudgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                            return a + b;
                                                        }, 0);
                                                        var totalbudgetedAmount = existingBudgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                            return a + b;
                                                        }, 0);
                                                        var totalsurplusAmount = paycheckData.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                            return a + b;
                                                        }, 0);
                                                        paycheckGet.update({
                                                            budgetDetails: existingBudgetDetails,
                                                            budgetsCurrent: totalbudgetedAmount,
                                                            budgetsToBeBudgeted: totalReceived - totalbudgetedAmount + totalsurplusAmount,
                                                            isOverbudget: (totalReceived - totalbudgetedAmount + totalsurplusAmount) < 0 ? true : false,
                                                            budgetsAvailable: totalReceived - totalspentAmount + totalsurplusAmount,
                                                            isOverspent: paycheckData.budgetsAvailable - remainAmount < 0 ? true : false
                                                        }).then(() => {
                                                            console.log("paycheck updated income sources >>>>>>");
                                                            let recentPaycheck = [];
                                                            incomeRef.doc(incomeSourceId).collection("paychecks").get().then((query) => {
                                                                query.docs.filter(o => {
                                                                    if (o.data().payDateTimeStamp > paycheckData.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                                        recentPaycheck.push(Object.assign({ id: o.id }, o.data()));
                                                                        recentPaycheck = recentPaycheck.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                                        return;
                                                                    }
                                                                });
                                                                if (recentPaycheck.length) {
                                                                    console.log("recent paycheck is foud income sources >>>>>>");
                                                                    let indx = recentPaycheck[0].budgetDetails.findIndex(o => o.category == params.transaction.categoryName);
                                                                    if (indx != -1) {
                                                                        recentPaycheck[0].budgetDetails[indx].available = (recentPaycheck[0].budgetDetails[indx].available + (-Math.abs(remainAmount)));
                                                                        recentPaycheck[0].budgetDetails[indx].budgeted = recentPaycheck[0].budgetDetails[indx].budgeted + (-Math.abs(remainAmount));
                                                                    }
                                                                    else {
                                                                        recentPaycheck[0].budgetDetails.push({
                                                                            "category": params.transaction.categoryName,
                                                                            "category_id": params.transaction.category_id,
                                                                            "budgeted": (-Math.abs(remainAmount)),
                                                                            "spent": 0,
                                                                            "available": (-Math.abs(remainAmount)),
                                                                            "transactions": []
                                                                        })
                                                                    }

                                                                    let _rindex = recentPaycheck[0].rolloverBudgetTemplate.findIndex(o => o.category === params.transaction.categoryName);
                                                                    if (_rindex != -1) {
                                                                        recentPaycheck[0].rolloverBudgetTemplate[_rindex].budgeted = recentPaycheck[0].rolloverBudgetTemplate[_rindex].budgeted + (-Math.abs(remainAmount));
                                                                        recentPaycheck[0].rolloverBudgetTemplate[_rindex].available = recentPaycheck[0].rolloverBudgetTemplate[_rindex].available + (-Math.abs(remainAmount));
                                                                    }
                                                                    else {
                                                                        recentPaycheck[0].rolloverBudgetTemplate.push({
                                                                            "category": params.transaction.categoryName,
                                                                            "category_id": params.transaction.category_id,
                                                                            "budgeted": (-Math.abs(remainAmount)),
                                                                            "spent": 0,
                                                                            "available": (-Math.abs(remainAmount)),
                                                                            "transactions": []
                                                                        });
                                                                    }
                                                                    var recentReceived = recentPaycheck[0].totalReceived === 0 ? recentPaycheck[0].totalExpected : recentPaycheck[0].totalReceived;
                                                                    var recentspentAmount = recentPaycheck[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                        return a + b;
                                                                    }, 0);
                                                                    var recentsurplusAmount = recentPaycheck[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                        return a + b;
                                                                    }, 0);
                                                                    var recentbudgetedAmount = recentPaycheck[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                        return a + b;
                                                                    }, 0);
                                                                    incomeRef.doc(incomeSourceId).collection("paychecks").doc(recentPaycheck[0].id).update({
                                                                        budgetDetails: recentPaycheck[0].budgetDetails,
                                                                        budgetsToBeBudgeted: recentReceived - recentbudgetedAmount + recentsurplusAmount,
                                                                        budgetsCurrent: recentbudgetedAmount,
                                                                        rolloverBudgetTemplate: recentPaycheck[0].rolloverBudgetTemplate,
                                                                        surplusBudgetTemplate: recentPaycheck[0].surplusBudgetTemplate,
                                                                        budgetsAvailable: recentReceived - recentspentAmount + recentsurplusAmount,
                                                                        isOverbudget: (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                                        isOverspent: (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                                    }).then(() => {
                                                                        console.log("mostrecent is updated >>>>>>");
                                                                        updateGoals(remainAmount, params.transaction.category_id);

                                                                    }).catch((e) => {
                                                                        console.log("error income sources >>>>>>", JSON.stringify(e));
                                                                        return res.status(200).send({
                                                                            success: true
                                                                        });
                                                                    });
                                                                }
                                                                else {
                                                                    console.log("no recent paycheck is found income sources >>>>>>");
                                                                    updateGoals(remainAmount, params.transaction.category_id);
                                                                }
                                                                function updateGoals(amount, category_id) {
                                                                    var goalRef = admin.firestore().collection('users').doc(userId).collection('goals')
                                                                    goalRef.where("goal_incomeSource_Id", "==", incomeSourceId).get().then((snap) => {
                                                                        if (snap.docs.length) {
                                                                            snap.docs.forEach((goal, indexA) => {
                                                                                if (goal.data().category_id === category_id) {
                                                                                    var goalData = goal.data();
                                                                                    if (goalData.goal_type === "saving") {
                                                                                        goalData.left_amount = goalData.left_amount - Math.abs(amount);
                                                                                        goalData.paid_amount = goalData.paid_amount + Math.abs(amount);
                                                                                        goalData.isAccomplished = (goalData.paid_amount >= goalData.goal_amount) ? true : false;
                                                                                        if (goalData.paid_amount >= goalData.goal_amount) {
                                                                                            goalData.left_amount = 0;
                                                                                        }
                                                                                        calculateDate(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                                                            goalData.goal_endDate = date;
                                                                                            goalRef.doc(goal.id).update({
                                                                                                left_amount: goalData.left_amount,
                                                                                                paid_amount: goalData.paid_amount,
                                                                                                goal_endDate: goalData.goal_endDate,
                                                                                                isAccomplished: goalData.isAccomplished
                                                                                            });
                                                                                        });
                                                                                    }
                                                                                    else {
                                                                                        goalData.left_amount = goalData.left_amount - Math.abs(amount);
                                                                                        goalData.paid_amount = goalData.paid_amount + Math.abs(amount);
                                                                                        goalData.isAccomplished = (goalData.paid_amount >= goalData.goal_amount) ? true : false;
                                                                                        if (goalData.paid_amount >= goalData.goal_amount) {
                                                                                            goalData.left_amount = 0;
                                                                                        }
                                                                                        calculateTarget(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                                                            goalData.goal_endDate = date;
                                                                                            goalRef.doc(goal.id).update({
                                                                                                left_amount: goalData.left_amount,
                                                                                                paid_amount: goalData.paid_amount,
                                                                                                goal_endDate: goalData.goal_endDate,
                                                                                                isAccomplished: goalData.isAccomplished
                                                                                            });
                                                                                        });
                                                                                    }
                                                                                }
                                                                                if (snap.docs.length - 1 === indexA) {
                                                                                    console.log("goals income sources >>>>>>");
                                                                                    return res.status(200).send({
                                                                                        success: true
                                                                                    });
                                                                                }
                                                                            });
                                                                        }
                                                                        else {
                                                                            console.log(" no goals income sources >>>>>>");
                                                                            return res.status(200).send({
                                                                                success: true
                                                                            });
                                                                        }
                                                                    })

                                                                }
                                                            })
                                                                .catch((error) => {
                                                                    console.log(" no goals income sources >>>>>>", JSON.stringify(error));
                                                                    return res.status(200).send({
                                                                        success: true
                                                                    });
                                                                });


                                                        }).catch((error) => {
                                                            console.log(" no goals income sources >>>>>>", JSON.stringify(error));
                                                            return res.status(200).send({
                                                                success: true
                                                            });
                                                        })
                                                    }
                                                }
                                            }).catch(function (error) {
                                                console.log("  >>>>>>", JSON.stringify(error));
                                                return res.status(200).send({
                                                    success: true
                                                });
                                            });
                                        }
                                        else {
                                            console.log(" mostrecnt not found in this income source >>>>>>");
                                            return res.status(200).send({
                                                success: true
                                            });
                                        }
                                    }
                                });
                            }).catch(err => {
                                console.log("error in the getting income source", JSON.stringify(err));
                                return res.status(200).send({
                                    success: true
                                });
                            })

                        })
                    }
                    else {
                        console.log("NO income source found");
                        return res.status(200).send({
                            success: true
                        });
                    }
                }).catch(err => {
                    console.log("error in the getting income source", JSON.stringify(err));
                    return res.status(200).send({
                        success: true
                    });
                })
            }

        }
        else {
            console.log("transaction record has some error");
            return res.status(200).send({
                success: true
            });
        }
    });
});

exports.createStripeSubscription = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        const tokenId = req.get('Authorization').split('Bearer ')[1];
        admin.auth().verifyIdToken(tokenId)
            .then((decodedToken) => {
                // console.log(req.body.coupon);
                stripe.subscriptions.create({
                    
                    customer: req.body.custId,
                    items: [
                        { price: BASIC_PRICE_ID },
                    ],

                    coupon: req.body.coupon,
                }).then((subscription) => {
                    let userRef = admin.firestore().collection('users').doc(req.body.userId);
                    userRef.get().then((userSnap) => {
                        let user = userSnap.data();
                        user['subscription_id'] = subscription.id;
                        user['sub_status'] = subscription.status;
                        userRef.set(user);
                        res.status(200).send({
                            success: true,
                            card: subscription
                            
                        });
                    })
                })
                    .catch((err) => {

                        console.log(error);
                        res.status(400).send({ success: false, error: err });
                    });
            })
            .catch((err) => {

                console.log(error);
                res.status(400).send({ success: false, error: err });
            });
    })
});

exports.dailybugetTemplateJobRequest = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        const usersRef = admin.firestore().collection("income_source").where("active", "==", true);
        usersRef.get().then(async (snapUsers) => {
            var userpromises = [];
            if (snapUsers.docs.length) {
                snapUsers.docs.map(async (o) => userpromises.push({ id: o.id }));
                if (userpromises.length) {
                    var usrCount = 0;
                    const totalUserActive = userpromises.length;
                    getUsersIncomeSources(userpromises[usrCount].id);
                    function getUsersIncomeSources(user_Id) {
                        usrCount++;
                        if (user_Id) {
                            const incomeRef = admin.firestore().collection("income_source").doc(user_Id).collection("incomes").where("isRepeating", "==", true);
                            incomeRef.get().then(async (snap) => {
                                var incomePromises = [];
                                if (snap.docs.length) {
                                    var incomeCount = 0;
                                    const totalIncomesource = snap.docs.length;
                                    snap.docs.map(async (o) => incomePromises.push(Object.assign({ id: o.id }, o.data())));
                                    // loop incomesources of the user found the todays paycheck if not return to next user
                                    getIncomeSource(incomePromises[incomeCount])
                                    function getIncomeSource(incomeObj) {
                                        incomeCount++;
                                        let payDates = incomeObj.repeating.payDays.map(e => e.toDate().toLocaleDateString());
                                        console.log(JSON.stringify(payDates))
                                        let index = payDates.findIndex(o => o == new Date('02/25/2022').toLocaleDateString())

                                        if (index != -1) {
                                            callback(incomeObj.id);
                                            function callback(incomeId) {
                                                console.log("h2::" + incomeId + "h3::" + user_Id);
                                                admin.firestore().collection("income_source").doc(user_Id).collection("incomes").doc(incomeId).collection('paychecks').get().then((snapPaycheck) => {
                                                    var mostRecentPaycheck = [], filterCurrent;
                                                    const numberOfPaychecks = (snapPaycheck.docs.length - 1)
                                                   snapPaycheck.docs.filter(e => {
                                                        if (new Date(e.data().payDateTimeStamp).toLocaleDateString() == new Date('02/25/2022').toLocaleDateString()) {
                                                            return filterCurrent = Object.assign({ id: e.id }, e.data())
                                                        }
                                                    });
                                                    snapPaycheck.docs.forEach((element, paycheckIndex) => {
                                                        if (element.data().payDateTimeStamp <= new Date('02/25/2022').getTime() && new Date(element.data().payDateTimeStamp).toLocaleDateString() != new Date('02/25/2022').toLocaleDateString()) {
                                                            mostRecentPaycheck.push(Object.assign({ id: element.id }, element.data()));
                                                            mostRecentPaycheck = mostRecentPaycheck.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp);
                                                            if (mostRecentPaycheck.length && paycheckIndex == numberOfPaychecks) {
                                                                console.log("processing the income")
                                                                mostRecentPaycheck[0].budgetDetails.forEach((budget, bIndex) => {
                                                                    console.log(mostRecentPaycheck[0].budgetDetails, bIndex);
                                                                    // find if budgetline itme is already in current paycheck
                                                                    let eIndex = filterCurrent.budgetDetails.findIndex(o => o.category === budget.category);
                                                                    if (eIndex != -1) {
                                                                        filterCurrent.budgetDetails[eIndex].budgeted = filterCurrent.budgetDetails[eIndex].budgeted + budget.available;
                                                                        filterCurrent.budgetDetails[eIndex].available = filterCurrent.budgetDetails[eIndex].available + budget.available;
                                                                    }
                                                                    else {
                                                                        filterCurrent.budgetDetails.push({
                                                                            "category": budget.category,
                                                                            "category_id": budget.category_id,
                                                                            "budgeted": budget.available,
                                                                            "spent": 0,
                                                                            "available": budget.available,
                                                                            "transactions": [],
                                                                            "goalId": budget.goalId ? budget.goalId : []
                                                                        })
                                                                    }
                                                                    if (bIndex == (mostRecentPaycheck[0].budgetDetails.length - 1)) {
                                                                        // here we update the current paychck of the user
                                                                        console.log("eet1");
                                                                        console.log(filterCurrent.budgetDetails);
                                                                        var totalReceived = filterCurrent.totalReceived === 0 ? filterCurrent.totalExpected : filterCurrent.totalReceived;
                                                                        var totalspentAmount = filterCurrent.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                            return a + b;
                                                                        }, 0);
                                                                        var totalbudgetedAmount = filterCurrent.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                            return a + b;
                                                                        }, 0);
                                                                        admin.firestore().collection("income_source").doc(user_Id).collection("incomes").doc(incomeId).collection('paychecks').doc(filterCurrent.id).update({
                                                                            budgetDetails: filterCurrent.budgetDetails,
                                                                            budgetsToBeBudgeted: totalReceived - totalbudgetedAmount,
                                                                            budgetsCurrent: totalbudgetedAmount,
                                                                            budgetsAvailable: totalReceived - totalspentAmount,
                                                                            isOverbudget: (totalReceived - totalbudgetedAmount) < 0 ? true : false,
                                                                            isOverspent: (totalReceived - totalspentAmount) < 0 ? true : false
                                                                        }).then(() => {
                                                                            // check the all paycheck are set or not 
                                                                            if (paycheckIndex == numberOfPaychecks) {
                                                                              if (totalIncomesource > incomeCount) {
                                                                                    getIncomeSource(incomePromises[incomeCount])
                                                                                }
                                                                                else {
                                                                                   if (usrCount < totalUserActive) {
                                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                                    } else {
                                                                                        res.send("all user checked level 7");
                                                                                    }
                                                                                }
                                                                            }
                                                                        }).catch((err) => {
                                                                            // check the all paycheck are set or not 
                                                                            if (paycheckIndex == numberOfPaychecks) {
                                                                                if (totalIncomesource > incomeCount) {
                                                                                    getIncomeSource(incomePromises[incomeCount])
                                                                                }
                                                                                else {
                                                                                   if (usrCount < totalUserActive) {
                                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                                    } else {
                                                                                        res.send("all user checked level 7");
                                                                                    }
                                                                                }
                                                                            }
                                                                        })

                                                                    }

                                                                });
                                                            }
                                                            else if (paycheckIndex == numberOfPaychecks) {
                                                                if (totalIncomesource > incomeCount) {
                                                                    getIncomeSource(incomePromises[incomeCount])
                                                                }
                                                                else {
                                                                  if (usrCount < totalUserActive) {
                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                    } else {
                                                                        res.send("all user checked level 7n");
                                                                    }
                                                                }
                                                            }

                                                        }
                                                        else {
                                                            console.log("b1");
                                                            if (mostRecentPaycheck.length && paycheckIndex == numberOfPaychecks) {
                                                                mostRecentPaycheck[0].budgetDetails.forEach((budget, bIndex) => {
                                                                    let eIndex = filterCurrent.budgetDetails.findIndex(o => o.category === budget.category);
                                                                    if (eIndex != -1) {
                                                                        filterCurrent.budgetDetails[eIndex].budgeted = filterCurrent.budgetDetails[eIndex].budgeted + budget.available;
                                                                        filterCurrent.budgetDetails[eIndex].available = filterCurrent.budgetDetails[eIndex].available + budget.available;
                                                                    }
                                                                    else {
                                                                        filterCurrent.budgetDetails.push({
                                                                            "category": budget.category,
                                                                            "category_id": budget.category_id,
                                                                            "budgeted": budget.available,
                                                                            "spent": 0,
                                                                            "available": budget.available,
                                                                            "transactions": [],
                                                                            "goalId": budget.goalId ? budget.goalId : []
                                                                        })
                                                                    }
                                                                    if (bIndex === (mostRecentPaycheck[0].budgetDetails.length - 1)) {
                                                                        // here we update the current paychck of the user
                                                                        console.log("b2");
                                                                        console.log(JSON.stringify(filterCurrent.budgetDetails));
                                                                        var totalReceived = filterCurrent.totalReceived === 0 ? filterCurrent.totalExpected : filterCurrent.totalReceived;
                                                                        var totalspentAmount = filterCurrent.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                            return a + b;
                                                                        }, 0);
                                                                        var totalbudgetedAmount = filterCurrent.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                            return a + b;
                                                                        }, 0);
                                                                        admin.firestore().collection("income_source").doc(user_Id).collection("incomes").doc(incomeId).collection('paychecks').doc(filterCurrent.id).update({
                                                                            budgetDetails: filterCurrent.budgetDetails,
                                                                            budgetsToBeBudgeted: totalReceived - totalbudgetedAmount,
                                                                            budgetsCurrent: totalbudgetedAmount,
                                                                            budgetsAvailable: totalReceived - totalspentAmount,
                                                                            isOverbudget: (totalReceived - totalbudgetedAmount) < 0 ? true : false,
                                                                            isOverspent: (totalReceived - totalspentAmount) < 0 ? true : false
                                                                        }).then(() => {
                                                                            // check the all paycheck are set or not 
                                                                            console.log("b3::" + paycheckIndex);
                                                                            if (paycheckIndex == numberOfPaychecks) {
                                                                                console.log("b4::" + totalIncomesource + "::" + incomeCount);
                                                                                if (totalIncomesource > incomeCount) {
                                                                                    getIncomeSource(incomePromises[incomeCount])
                                                                                }
                                                                                else {
                                                                                    console.log("b5::" + totalUserActive + "::" + usrCount);
                                                                                    if (usrCount < totalUserActive) {
                                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                                    } else {
                                                                                        res.send("all user checked level 7");
                                                                                    }
                                                                                }
                                                                            }
                                                                        }).catch((err) => {
                                                                            console.log(err + "b3e::" + paycheckIndex);
                                                                            // check the all paycheck are set or not 
                                                                            if (paycheckIndex == numberOfPaychecks) {
                                                                                console.log("b4::" + totalIncomesource + "::" + incomeCount);
                                                                                if (totalIncomesource > incomeCount) {
                                                                                    getIncomeSource(incomePromises[incomeCount])
                                                                                }
                                                                                else {
                                                                                    console.log("b5::" + totalUserActive + "::" + usrCount);
                                                                                    if (usrCount < totalUserActive) {
                                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                                    } else {
                                                                                        res.send("all user checked level 7");
                                                                                    }
                                                                                }
                                                                            }
                                                                        })

                                                                    }
                                                                });
                                                            }
                                                            else if (paycheckIndex == numberOfPaychecks) {
                                                                console.log("e4::" + totalIncomesource + "::" + incomeCount);
                                                                if (totalIncomesource > incomeCount) {
                                                                    getIncomeSource(incomePromises[incomeCount])
                                                                }
                                                                else {
                                                                    console.log("e5::" + totalUserActive + "::" + usrCount);
                                                                    if (usrCount < totalUserActive) {
                                                                        getUsersIncomeSources(userpromises[usrCount].id)
                                                                    } else {
                                                                        res.send("all user checked level e7");
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    });
                                                }).catch((error) => {
                                                    console.log(error);
                                                    if (totalIncomesource > incomeCount) {
                                                        getIncomeSource(incomePromises[incomeCount])
                                                    }
                                                    else {
                                                        if (usrCount < totalUserActive) {
                                                            getUsersIncomeSources(userpromises[usrCount].id)
                                                        } else {
                                                            res.send("all user checked level 4");
                                                        }
                                                    }
                                                })
                                            }
                                        }
                                        else {
                                            if (totalIncomesource > incomeCount) {
                                                getIncomeSource(incomePromises[incomeCount])
                                            }
                                            else {
                                                if (usrCount < totalUserActive) {
                                                    getUsersIncomeSources(userpromises[usrCount].id)
                                                } else {
                                                    res.send("all user checked level 4");
                                                }
                                            }
                                        }
                                    }
                                }
                                else {
                                    if (usrCount < totalUserActive) {
                                        getUsersIncomeSources(userpromises[usrCount].id)
                                    } else {
                                        res.send("all user checked level 3");
                                    }
                                }

                            }).catch(err => {
                                console.log(err);
                                if (usrCount < totalUserActive) {
                                    getUsersIncomeSources(userpromises[usrCount].id)
                                }
                                else {
                                    res.send("all user checked level 2");
                                }
                            })
                        }
                        else {
                            if (usrCount < totalUserActive) {
                                getUsersIncomeSources(userpromises[usrCount].id)
                            }
                            else {
                                console.log('all users length is', totalUserActive);
                                res.send("all user checked level 1");

                            }
                        }
                    }

                }
                else {
                    console.log('no user found for run this query')
                    res.send("no users");
                }
            }
        }).catch((error) => {
            console.log("er while the runu", error)
            res.send("er while the runu");
        });
    })
});

exports.getAllProduct = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        const products = await stripe.plans.list();
        return res.status(200).send({
            success: true,
            products: products
        })
    })
});

exports.getIncomeSourceById = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        incomeRef = admin.firestore().collection("income_source").doc(request.query.userId).collection("incomes").doc(request.query.id);
        incomeRef.get().then((groupSnap) => {
            data = groupSnap.data();
            let promises = {
                "id": groupSnap.id,
                "name": data.name,
                "isRepeating": data.isRepeating,
                "weeks": data.weeks,
                "repeating": data.isRepeating ? {
                    "type": data.repeating.type,
                    "payDays": data.repeating.payDays.map(o => o.toDate())

                } : null,
                "startDate": data.startDate.toDate(),
                "budgetTemplate": data.budgetTemplate,
                'paychecks': []
            }


            var groupRef = incomeRef.collection("paychecks");
            let count = 0;
            groupRef.get().then((snapPayCheks) => {
                snapPayCheks.docs.forEach((groupSnapPaychecks) => {
                    count++;
                    promises.paychecks.push(Object.assign({}, { id: groupSnapPaychecks.id }, groupSnapPaychecks.data(), { payDate: groupSnapPaychecks.data().payDate.toDate() }))
                    if (count == snapPayCheks.docs.length) {
                        response.status(200).send({
                            incomes: promises
                        });
                    }
                });
            });
        })
    })
});

exports.getIncomeSource = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        incomeRef = admin.firestore().collection("income_source").doc(request.query.userId).collection("incomes");
        incomeRef.get().then((snap) => {
            const promises = [];
            snap.docs.forEach((groupSnap) => {
                data = groupSnap.data();
                promises.push({
                    "id": groupSnap.id,
                    "name": data.name,
                    "weeks": data.weeks,
                    "isRepeating": data.isRepeating,
                    "repeating": data.isRepeating ? {
                        "type": data.repeating.type,
                        "payDays": data.repeating.payDays.map(o => o.toDate())

                    } : null,
                    "startDate": data.startDate.toDate(),
                    "budgetTemplate": data.budgetTemplate,
                    'paychecks': []
                })
            });
            Promise.all(promises)
                .then(results => {
                    let count = 0;
                    if (results.length === 0) {
                        return response.status(200).send({
                            incomes: []
                        });
                    }
                    results.forEach(function (groupLists) {
                        var groupRef = incomeRef.doc(groupLists.id).collection("paychecks");
                        groupRef.get().then((snapPayCheks) => {
                            count++;
                            snapPayCheks.docs.forEach((groupSnapPaychecks) => {
                                groupLists.paychecks.push(Object.assign({}, { id: groupSnapPaychecks.id }, groupSnapPaychecks.data(), { payDate: groupSnapPaychecks.data().payDate.toDate() }))
                            });
                            Promise.all(promises)
                                .then(resultPayCheks => {
                                    if (count === promises.length) {
                                        response.status(200).send({
                                            incomes: resultPayCheks
                                        });
                                    }
                                });
                        });
                    })
                })
        }).catch((err) => {
            response.status(400).send({
                message: JSON.stringify(err)
            });
        })
    })
});

exports.getPaychecksOfPlaidTransaction = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        let ref = admin.firestore().collection("user_plaid_transaction").doc(req.query.userId).collection("transactions").doc(req.query.id);
        ref.get().then((snap) => {
            const data = snap.data();
            const promises = [];
            const incomeSource = [];
            incomeRef = admin.firestore().collection("income_source").doc(req.query.userId).collection("incomes");
            let ref = admin.firestore().collection("user_plaid_transaction").doc(req.query.userId).collection("transactions").doc(req.query.id);
            ref.get().then((snap) => {
                const data = snap.data();
                const promises = [];
                const incomeSource = [];
                incomeRef = admin.firestore().collection("income_source").doc(req.query.userId).collection("incomes");
                if (data.assignment) {
                    let count = 0;
                    data.assignment.forEach((paycheckId) => {
                        let fetchIncomes = incomeRef.where("paycheckIds", "array-contains", paycheckId);
                        fetchIncomes.get().then((snap) => {
                            let incomeSourceId = snap.docs[0].id;
                            incomeSource.push({
                                incomeSourceId: incomeSourceId,
                                paycheckId: paycheckId
                            })
                            count++;
                            if (count == data.assignment.length) {
                                incomeSource.forEach((source) => {
                                    promises.push(incomeRef.doc(source.incomeSourceId).collection("paychecks").doc(source.paycheckId).get())
                                });
                                Promise.all(promises)
                                    .then(paycheksData => {
                                        result = [];
                                        paycheksData.forEach(function (paychecks) {
                                            result.push((Object.assign({}, { id: paychecks.id }, paychecks.data(), { payDate: paychecks.data().payDate.toDate() })))

                                        });
                                        res.status(200).send({
                                            paychecks: result
                                        });
                                    })


                            }
                        })
                    });

                } else {
                    res.status(200).send({
                        message: "No assignment"
                    });

                }

            })
                .catch((err) => {
                    res.status(400).send({
                        message: JSON.stringify(err)
                    });

                })

        });

    })
});

exports.getPlaidCategories = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        const body = request.body;
        const plaidRef = admin.firestore().collection('plaid_categories');
        try {
            var array = []
            admin.firestore().collection('users').doc(request.query.userId).collection('uniqueCategories').get().then(res => {
                if (res.docs.length) {
                    res.docs.forEach((element, index) => {
                        var string = "";
                        for (var i = 0; i < element.data().hierarchy.length; i++) {
                            string = i == 0 ? element.data().hierarchy[i] : string + "-" + element.data().hierarchy[i];
                        }
                        array.push(Object.assign({ categoryName: string }, element.data()))
                        if (index === (res.docs.length - 1)) {
                            addPlaidCategories(array);
                        }
                    });
                }
                else {
                    addPlaidCategories([]);
                }
            });
            async function addPlaidCategories(arr) {
                let mappedCategory = [];
                let count = 0;
                plaidRef.get().then(refCategories => {
                    if (refCategories.docs.length && refCategories.docs[0].data().categories) {
                        console.log(JSON.stringify(refCategories.docs[0].data().categories));
                        var categories = refCategories.docs[0].data().categories;
                        categories.forEach(cp => {
                            var string = "";
                            for (var i = 0; i < cp.hierarchy.length; i++) {
                                string = i == 0 ? cp.hierarchy[i] : string + "-" + cp.hierarchy[i];
                            }
                            arr.push(Object.assign({ categoryName: string }, cp));
                            count++;
                            if (count === categories.length) {
                                mappedCategory = arr.sort((a, b) => a.categoryName > b.categoryName && 1 || -1)
                                response.status(200).send({
                                    success: true,
                                    categories: mappedCategory
                                });
                            }
                        });
                    }
                })
                // const results = await client.categoriesGet({});
                // const categories = results.data.categories;
                // console.log(categories.length)

            }
        } catch (error) {
            // handle error
            console.log("err")
            response.status(400).send({
                success: false,
                error: err
            });
        }
    });
});

exports.getPlaidTransaction = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        transRef = admin.firestore().collection("user_plaid_transaction").doc(request.query.userId).collection("transactions");
        transRef.get().then((snap) => {
            const promises = [];
            snap.docs.forEach((transSnap) => {
                promises.push(Object.assign({ id: transSnap.id }, transSnap.data()))
            });
            Promise.all(promises)
                .then(results => {
                    let count = 0;
                    if (results.length === 0) {
                        return response.status(200).send({
                            transactions: []
                        });
                    }
                    else {
                        return response.status(200).send({
                            transactions: results
                        });
                    }
                })
        }).catch((err) => {
            response.status(400).send({
                message: JSON.stringify(err)
            });

        })
    })
});

exports.getPlaidTransactionById = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        incomeRef = admin.firestore().collection("user_plaid_transaction").doc(request.query.userId).collection("transactions").doc(request.query.id);
        incomeRef.get().then((snap) => {
            return response.status(200).send({
                transactions: snap.data()
            });
        })
    })
});

exports.getSurplus = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        const params = request.body;
        const incomeRef = admin.firestore().collection("income_source").doc(params.userId).collection("incomes").doc(params.incomeSourceId).collection('paychecks');
        if (params.payDateTimeStamp <= new Date().getTime()) {
            incomeRef.get().then((snapShot) => {
                if (snapShot.docs.length) {
                    var mostRecentsPaychecks = [];
                    var paycheckData;
                    snapShot.docs.forEach((o, _countIndex) => {
                        if (o.id === params.paycheckId) {
                            paycheckData = o.data();
                        }
                        if (o.data().payDateTimeStamp < params.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                            mostRecentsPaychecks.push(Object.assign({ id: o.id }, o.data()));
                            mostRecentsPaychecks = mostRecentsPaychecks.sort((a, b) => a.payDateTimeStamp - b.payDateTimeStamp)
                        }
                        if (_countIndex === (snapShot.docs.length - 1)) {
                            if (mostRecentsPaychecks.length && paycheckData) {
                                var totalbudgetsAvailable = 0
                                mostRecentsPaychecks.forEach((paycheck, index) => {
                                    let currentlyAvailable = paycheck.budgetsAvailable;
                                    if (paycheck.surplusBudgetTemplate.length) {
                                        var totalsurplusAmount = paycheck.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                            return a + b;
                                        }, 0);
                                        currentlyAvailable = currentlyAvailable - totalsurplusAmount;
                                    }
                                    totalbudgetsAvailable = totalbudgetsAvailable + currentlyAvailable;
                                    if (index === (mostRecentsPaychecks.length - 1)) {
                                        var recentReceived = paycheckData.totalReceived === 0 ? paycheckData.totalExpected : paycheckData.totalReceived;
                                        var recentspentAmount = paycheckData.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                            return a + b;
                                        }, 0);
                                        var recentbudgetedAmount = paycheckData.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                            return a + b;
                                        }, 0);
                                        var surplusBudgetTemplate = [{
                                            paycheckId: paycheck.id,
                                            amount: totalbudgetsAvailable
                                        }]
                                        incomeRef.doc(params.paycheckId).update({
                                            budgetsToBeBudgeted: (recentReceived - recentbudgetedAmount) + totalbudgetsAvailable,
                                            surplusBudgetTemplate: surplusBudgetTemplate,
                                            budgetsAvailable: (recentReceived - recentspentAmount) + totalbudgetsAvailable,
                                            isOverbudget: (recentReceived - recentbudgetedAmount + totalbudgetsAvailable) < 0 ? true : false,
                                            isOverspent: (recentReceived - recentspentAmount + totalbudgetsAvailable) < 0 ? true : false
                                        }).then(() => {
                                            return response.status(200).send({
                                                success: true,
                                                message: "Surplus loaded",
                                                budgetsToBeBudgeted: (recentReceived - recentbudgetedAmount) + totalbudgetsAvailable,
                                                surplusBudgetTemplate: surplusBudgetTemplate,
                                                budgetsAvailable: (recentReceived - recentspentAmount) + totalbudgetsAvailable,
                                                isOverbudget: (recentReceived - recentbudgetedAmount + totalbudgetsAvailable) < 0 ? true : false,
                                                isOverspent: (recentReceived - recentspentAmount + totalbudgetsAvailable) < 0 ? true : false
                                            })
                                        }).catch((err) => {
                                            console.log("error in the paycheck update", err);
                                            return response.status(200).send({
                                                success: true,
                                                message: "Surplus loaded",
                                                budgetsToBeBudgeted: (recentReceived - recentbudgetedAmount) + totalbudgetsAvailable,
                                                surplusBudgetTemplate: surplusBudgetTemplate,
                                                budgetsAvailable: (recentReceived - recentspentAmount) + totalbudgetsAvailable,
                                                isOverbudget: (recentReceived - recentbudgetedAmount + totalbudgetsAvailable) < 0 ? true : false,
                                                isOverspent: (recentReceived - recentspentAmount + totalbudgetsAvailable) < 0 ? true : false
                                            });
                                        })
                                    }
                                })
                            }
                            else {
                                return response.status(200).send({
                                    success: false,
                                    message: "Most recent not found"
                                })
                            }
                        }
                    });

                }
                else {
                    return response.status(200).send({
                        success: false,
                        message: "No Paychecks Found for the current income source"
                    })
                }
            }).catch((err) => {
                console.log("error while getting income source paychecks", err);
                return response.status(200).send({
                    success: false,
                    message: 'error while getting income source paychecks',
                    error: JSON.stringify(err)
                });
            })
        }
        else {
            return response.status(200).send({
                success: false,
                message: 'paycheck Is Not mostRecent'
            });
        }
    })
});

exports.getTransaction = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        transRef = admin.firestore().collection("user_transaction").doc(request.query.userId).collection("transactions");
        transRef.get().then((snap) => {
            const promises = [];
            snap.docs.forEach((transSnap) => {
                promises.push(Object.assign({ id: transSnap.id }, transSnap.data(), { transactionDateTime: transSnap.data().transactionDateTime.toDate() }))
            });
            Promise.all(promises)
                .then(results => {
                    let count = 0;
                    if (results.length === 0) {
                        return response.status(200).send({
                            transactions: []
                        });
                    }
                    else {
                        return response.status(200).send({
                            transactions: results
                        });
                    }
                })
        }).catch((err) => {
            response.status(400).send({
                message: JSON.stringify(err)
            });

        })
    })
});

exports.getUserAccounts = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        admin.firestore().collection('accounts').doc(req.query.userId).collection('bank_account').get().then((account) => {
            var acc = [];
            if (account.docs.length) {
                account.docs.filter(o => {
                    acc.push(Object.assign({ id: o.id }, o.data()));
                    return;
                });
                return res.status(200).send({ success: true, accounts: acc });
            } else {
                return res.status(200).send({ success: true, accounts: acc });
            }
        }).catch(function (er) {
            return res.status(400).send({ success: false, error: er });
        });
    })
});

exports.getUserGoal = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        admin.firestore().collection('users').doc(req.query.userId).collection('goals').get().then((goal) => {
            var goals = [];
            if (goal.docs.length) {
                goal.docs.filter(o => {
                    goals.push(Object.assign(o.data(), { id: o.id }));
                    return;
                });
                return res.status(200).send({ success: true, goal: goals });
            } else {
                return res.status(200).send({ success: true, goal: goals });
            }
        }).catch(function (er) {
            return res.status(400).send({ success: false, error: er });
        });
    })
});

exports.monthStartOrEnd = functions.pubsub.schedule('00 9 * * *').onRun(context => {
    const incomesId = context.params.incomesId;
    var date = new Date(), y = date.getFullYear(), m = date.getMonth();
    var firstDay = new Date(y, m, 1).toLocaleDateString();
    var lastDay = new Date(y, m + 1, 0).toLocaleDateString();
    const usersRef = admin.firestore().collection("users");
    usersRef.get().then(async (snapUsers) => {
        var allUsersPromise = [];
        if (snapUsers.docs.length) {
            const totalUsersCount = snapUsers.docs.length;
            snapUsers.docs.map(o => allUsersPromise.push(Object.assign({ id: o.id }, o.data())))
            var userCount = 0;
            getUserDetails(allUsersPromise[userCount])
            function getUserDetails(userSnap) {
                userCount++;
                const userId = userSnap.id;
                const userDetails = userSnap;
                if (firstDay === date.toLocaleDateString()) {
                    const incomeRef = admin.firestore().collection("income_source").doc(userId).collection('incomes')
                    incomeRef.get().then(async (incomeSnap) => {
                        var incomeSources = []
                        if (incomeSnap.docs.length) {
                            const totalIncomesource = incomeSnap.docs.length;
                            var incomeCount = 0;
                            incomeSnap.docs.map(o => incomeSources.push(Object.assign({ id: o.id }, o.data())));
                            getIncomeSources(incomeSources[incomeCount]);
                            function getIncomeSources(incomeSource) {
                                incomeCount++;
                                const incomeSourceId = incomeSource.id;
                                incomeRef.doc(incomeSourceId).collection('paychecks').get().then((paycheckSnap) => {
                                    var paychecksStack = [];
                                    if (incomeSnap.docs.length) {
                                        incomeSnap.docs.filter(o => {
                                            if (new Date(o.data().payDateTimeStamp.toLocaleDateString()).getTime() <= firstDay.getTime()) {
                                                paychecksStack.push(Object.assign({ id: o.id }, o.data()));
                                                paychecksStack = paychecksStack.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp);
                                            }
                                        });
                                        if (paychecksStack.length && paychecksStack[0].budgetsToBeBudgeted) {
                                            let message = {
                                                notification: {
                                                    title: `MyFondi Budget Management`,
                                                    body: `We notice that you still have funds within your To Be Budgeted balance. You should think about adding the additional funds to your goal or invest your money. `,
                                                    sound: "default"
                                                },
                                            };
                                            admin.messaging().sendToDevice(userDetails.userFcmToken, message).then(res => {
                                                console.log("Sent Successfully", res);
                                                if (incomeCount < totalIncomesource) {
                                                    getIncomeSources(incomeSources[incomeCount]);
                                                }
                                                else if (incomeCount === totalIncomesource && userCount < totalUsersCount) {
                                                    getUserDetails(allUsersPromise[userCount]);
                                                }
                                            }).catch(err => {
                                                console.log(err + "notification error");
                                                if (incomeCount < totalIncomesource) {
                                                    getIncomeSources(incomeSources[incomeCount]);
                                                }
                                                else if (incomeCount === totalIncomesource && userCount < totalUsersCount) {
                                                    getUserDetails(allUsersPromise[userCount]);
                                                }
                                            });
                                        }
                                        else {
                                            if (incomeCount < totalIncomesource) {
                                                getIncomeSources(incomeSources[incomeCount]);
                                            }
                                            else if (incomeCount === totalIncomesource && userCount < totalUsersCount) {
                                                getUserDetails(allUsersPromise[userCount]);
                                            }
                                        }
                                    }
                                    else {
                                        if (incomeCount < totalIncomesource) {
                                            getIncomeSources(incomeSources[incomeCount]);
                                        }
                                        else if (incomeCount === totalIncomesource && userCount < totalUsersCount) {
                                            getUserDetails(allUsersPromise[userCount]);
                                        }
                                    }
                                }).catch(err => {
                                    console.log(err + "notification error");
                                    if (incomeCount < totalIncomesource) {
                                        getIncomeSources(incomeSources[incomeCount]);
                                    }
                                    else if (incomeCount === totalIncomesource && userCount < totalUsersCount) {
                                        getUserDetails(allUsersPromise[userCount]);
                                    }
                                });
                            }
                        }
                        else {
                            if (userCount < totalUsersCount) {
                                getUserDetails(allUsersPromise[userCount]);
                            }
                        }
                    }).catch(err => {
                        console.log(err + "notification error");
                        if (userCount < totalUsersCount) {
                            getUserDetails(allUsersPromise[userCount]);
                        }
                    });
                    // transaction notification
                }
                if (lastDay === date.toLocaleDateString()) {
                    // goal notification
                    usersRef.doc(userId).collection('goals').get().then((goalSnap) => {
                        if (goalSnap.docs.length) {
                            goalSnap.docs.forEach((goaldata, gIndex) => {
                                let endDate1 = new Date(goaldata.data().goal_endDate).toLocaleDateString('en-GB', {
                                    day: 'numeric', month: 'short', year: 'numeric'
                                }).replace(/ /g, '-')
                                console.log(endDate1);
                                let message = {
                                    notification: {
                                        title: `MyFondi Goal Tracking`,
                                        body: `You are on track to complete your goal by ${endDate1}`,
                                        sound: "default"
                                    },
                                };
                                admin.messaging().sendToDevice(userDetails.userFcmToken, message).then(res => {
                                    console.log("Sent Successfully", res);
                                    if (gIndex === (goalSnap.docs.length - 1) && userCount < totalUsersCount) {
                                        getUserDetails(allUsersPromise[userCount]);
                                    }
                                }).catch(err => {
                                    console.log(err + "notification error");
                                    if (gIndex === (goalSnap.docs.length - 1) && userCount < totalUsersCount) {
                                        getUserDetails(allUsersPromise[userCount]);
                                    }
                                });
                            })
                        }
                        else {
                            if (userCount < totalUsersCount) {
                                getUserDetails(allUsersPromise[userCount]);
                            }
                        }
                    }).catch(err => {
                        console.log(err + "notification error");
                        if (userCount < totalUsersCount) {
                            getUserDetails(allUsersPromise[userCount]);
                        }
                    })
                }
            }

        }

    })
});

exports.onGoalChanges = functions.firestore.document('users/{userId}/goals/{goalId}').onUpdate((change, context) => {
    const goalId = context.params.goalId;
    const userId = context.params.userId;
    const goalbeforeUpdate = change.before.data();
    const goalAfterUpdate = change.after.data();
    var userFcmToken = '';
    admin.firestore().collection('users').doc(userId).get().then((userSnap) => {
        if (userSnap.exists) {
            userFcmToken = userSnap.data().userFcmToken;
            if ((goalAfterUpdate.paid_amount - goalbeforeUpdate.paid_amount) > goalAfterUpdate.goal_monthly_amount) {
                console.log("differance", (goalbeforeUpdate.paid_amount - goalAfterUpdate.paid_amount), goalAfterUpdate.goal_monthly_amount)
                var diff = new DateDiff(goalAfterUpdate.goal_endDate, goalbeforeUpdate.goal_endDate);
                let weeks = diff.weeks();
                if (weeks > 0 && userFcmToken) {
                    let message = {
                        notification: {
                            title: `MyFondi Goal Tracking`,
                            body: `Wow, you paid extra into your ${goalAfterUpdate.goal_name} goal. You are going to reach your goal ${weeks} weeks faster.`,
                            sound: "default"
                        },
                    };
                    admin.messaging().sendToDevice(userFcmToken, message).then(res => {
                        console.log("Sent Successfully", res);
                    }).catch(err => {
                        console.log(err + "notification error");
                    });
                }
            }
            if (goalbeforeUpdate.paid_amount < goalAfterUpdate.paid_amount && userFcmToken) {
                let endDate1 = new Date(goalAfterUpdate.goal_endDate).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric'
                }).replace(/ /g, '-')
                console.log(endDate1);
                let msg = goalAfterUpdate.goal_type == "saving" ? `Your ${goalAfterUpdate.goal_name} savings goal decreased. Lets stay on track to reach your goal by ${endDate1}.` : `Your ${goalAfterUpdate.goal_name} debt management goal increased. Lets stay on track to reach your goal by ${endDate1}.`
                let message = {
                    notification: {
                        title: `MyFondi Goal Tracking`,
                        body: msg,
                        sound: "default"
                    },
                };
                admin.messaging().sendToDevice(userFcmToken, message).then(res => {
                    console.log("Sent Successfully", res);
                }).catch(err => {
                    console.log(err + "notification error");
                });
            }
            if ((goalAfterUpdate.paid_amount >= goalAfterUpdate.goal_amount || goalAfterUpdate.isAccomplished) && userFcmToken) {
                let message = {
                    notification: {
                        title: `CONGRATULATIONS!!!!!!`,
                        body: `You've reached your goal!!!!!!`,
                        sound: "default"
                    },
                };
                admin.messaging().sendToDevice(userFcmToken, message).then(res => {
                    console.log("Sent Successfully", res);
                }).catch(err => {
                    console.log(err + "notification error");
                });
            }
            if ((goalAfterUpdate.paid_amount >= goalAfterUpdate.goal_amount && !goalAfterUpdate.isAccomplished)) {
                admin.firestore().collection('users').doc(userId).collection('goals').doc(goalId).update({
                    isAccomplished: true
                });
            }
        }
    })
    console.log(`a goal ${goalId} is updated in userAccount ${userId}`, JSON.stringify(change));
    return null;
});

exports.onpaycheckChanges = functions.firestore.document('income_source/{userId}/incomes/{incomesId}/paychecks/{paychecksId}').onUpdate((change, context) => {
    const incomesId = context.params.incomesId;
    const userId = context.params.userId;
    const paycheckId = context.params.paychecksId;
    const paycheckbeforeUpdate = change.before.data();
    const paycheckAfterUpdate = change.after.data();
    var userFcmToken = '';
    admin.firestore().collection('users').doc(userId).get().then((userSnap) => {
        if (userSnap.exists) {
            userFcmToken = userSnap.data().userFcmToken;
            var Mostrecent = [];
            if (paycheckAfterUpdate.budgetsToBeBudgeted <= 0 && userFcmToken) {
                let message = {
                    notification: {
                        title: `MyFondi Budget Management`,
                        body: `You are overbudget within your ${paycheckAfterUpdate.name}. Review your budget to reduce your overage.`,
                        sound: "default"
                    },
                };
                admin.messaging().sendToDevice(userFcmToken, message).then(res => {
                    console.log("Sent Successfully", res);
                }).catch(err => {
                    console.log(err + "notification error");
                });
            }
            admin.firestore().collection('income_source').doc(userId).collection('incomes').doc(incomesId).get().then((incomeSnap) => {
                incomeSnap.docs.filter(o => {
                    if (o.data().payDateTimeStamp <= new Date().getTime()) {
                        Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                        Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                        return;
                    }
                });
                if (Mostrecent.length && paycheckAfterUpdate.payDateTimeStamp <= new Date().getTime()) {
                    let overspent = Mostrecent[0].budgetDetails.filter(o => o.available < 0);
                    if (Mostrecent[0].budgetsAvailable < 0 && userFcmToken) {
                        let message = {
                            notification: {
                                title: `MyFondi Budget Management`,
                                body: `Your Currently Available balance is in a deficit in your  ${paycheckAfterUpdate.name} which means you could possibly be in a deficit within your bank account. `,
                                sound: "default"
                            },
                        };
                        admin.messaging().sendToDevice(userFcmToken, message).then(res => {
                            console.log("Sent Successfully", res);
                        }).catch(err => {
                            console.log(err + "notification error");
                        });
                    }
                    if (overspent.length && userFcmToken) {
                        let message = {
                            notification: {
                                title: `MyFondi Budget Management`,
                                body: `You've overspent within ${paycheckAfterUpdate.name}. Review your budget to reduce your overage.`,
                                sound: "default"
                            },
                        };
                        admin.messaging().sendToDevice(userFcmToken, message).then(res => {
                            console.log("Sent Successfully", res);
                        }).catch(err => {
                            console.log(err + "notification error");
                        });
                    }
                    if (Mostrecent.length > 2 && userFcmToken) {
                        Mostrecent[0].budgetDetails.forEach((budget, bIndex) => {
                            if (budget.available < 0) {
                                let b1 = Mostrecent[1].budgetDetails.findIndex(o => o.category === budget.category);
                                let b2 = Mostrecent[2].budgetDetails.findIndex(o => o.category === budget.category);
                                if (b1 != -1 && b2 != -1 && (Mostrecent[1].budgetDetails[b1].available < 0 && Mostrecent[2].budgetDetails[b2].available < 0)) {
                                    let message = {
                                        notification: {
                                            title: `MyFondi Budget Management`,
                                            body: `You are consistently overspending within ${budget.category}. You should think about increasing your budget for this category. `,
                                            sound: "default"
                                        },
                                    };
                                    admin.messaging().sendToDevice(userFcmToken, message).then(res => {
                                        console.log("Sent Successfully", res);
                                    }).catch(err => {
                                        console.log(err + "notification error");
                                    });
                                }
                            }
                        })
                    }
                }
            })

        }
    })

    console.log(`a paycheck ${paycheckId} is updated in IncomeSource ${incomesId} of userAccount ${userId}`, JSON.stringify(change));


});

exports.onNewTransactionAdded = functions.firestore.document('/user_plaid_transaction/{userId}/transactions/{transactionId}').onCreate((snapshot, context) => {

    const userId = context.params.userId;
    const bankType = snapshot.data().bankType;
    const trans = snapshot.data();
    console.log(trans.updatedTransaction);
    if (trans && trans.updatedTransaction) {
        axios.post('https://us-central1-myfondi-v2.cloudfunctions.net/autoAssignEngine', { userId: userId, bankType: bankType, transaction: trans }, { headers: { 'Content-Type': 'application/json', } });
        console.log("api calling")

    }
    else {
        console.log("transaction record has some error");
        return 0;
    }
    return null;
});

exports.removeGoals = functions.https.onRequest((request, response) => {
    cors(request, response, () => {
        const body = request.body;
        const goalRef = admin.firestore().collection('users').doc(body.userId).collection('goals').doc(body.goalId);
        goalRef.get().then((goalSnap) => {
            if (goalSnap.exists) {
                var goalData = Object.assign({ goal_monthly_amount: goalSnap.data().goal_type === "saving" ? goalSnap.data().goal_monthly_amount : goalSnap.data().goal_target_amount },
                    goalSnap.data());
                console.log(JSON.stringify(goalData.isAccomplished));
                if (goalData.isAccomplished) {
                    if (goalData.goal_incomeSource_Id && !goalData.bank_detail.length) {
                        var fetchIncomes = admin.firestore().collection('income_source').doc(body.userId).collection('incomes').doc(goalData.goal_incomeSource_Id);
                        fetchIncomes.get().then(snap => {
                            const dbData = snap.data();
                            var existingBudgetDetails = [];
                            existingBudgetDetails = dbData.budgetTemplate.budgetTemplateDetails;
                            existingBudgetDetails = existingBudgetDetails.filter(o => o.category != goalData.goal_category);
                            fetchIncomes.update({
                                ['budgetTemplate.budgetTemplateDetails']: existingBudgetDetails,
                            }).then(() => {
                                goalRef.update({
                                    isRemoved: true
                                }).then(() => {
                                    return response.status(200).send({ success: true, message: "goal removed SuccessFullt!!" });
                                }).catch(error => {
                                    console.log("log level1 :" + JSON.stringify(error))
                                    return response.status(400).send({
                                        success: false,
                                        message: "Something going wrong when we try to remove your goal", error: error
                                    });
                                })
                            })
                        }).catch(error => {
                            console.log("log level2 :" + JSON.stringify(error))
                            return response.status(400).send({
                                success: false,
                                message: "Something going wrong when we try to remove your goal", error: error
                            });
                        })
                    } else {
                        goalRef.update({
                            isRemoved: true
                        }).then(() => {
                            return response.status(200).send({ success: true, message: "goal removed SuccessFullt!!" });
                        }).catch(error => {
                            console.log("log level3 :" + JSON.stringify(error))
                            return response.status(400).send({
                                success: false,
                                message: "Something going wrong when we try to remove your goal",
                                error: error
                            });
                        })
                    }
                }
                else {
                    return response.status(200).send({ success: false, message: "Not Able to Removed This Goal" });
                }
            }
            else {
                return response.status(200).send({ success: false, message: "Goal Not exists." });
            }
        }).catch(error => {
            console.log("log level4 :" + JSON.stringify(error))
            return response.status(400).send({
                success: false,
                message: "Server Connection Error. Please Try After Some Time",
                error: error
            });
        })
    })
});

exports.saveGoals = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        const data = req.body;
        var goal = data.goal;
        let users = admin.firestore().collection('users').doc(data.userId);
        const incomeRef = admin.firestore().collection("income_source").doc(data.userId).collection("incomes");
        if (goal.goal_incomeSource_Id != null && goal.bank_detail.length === 0) {
            users.collection('goals').add(goal).then(function (docRef) {
                var fetchIncomes = incomeRef.doc(goal.goal_incomeSource_Id);
                fetchIncomes.get().then((snap) => {
                    var existingincomeBudgetDetails = [];
                    existingincomeBudgetDetails = snap.data().budgetTemplate.budgetTemplateDetails;
                    let _indexI = existingincomeBudgetDetails.findIndex(o => o.category === goal.goal_category);
                    if (_indexI != -1) {
                        existingincomeBudgetDetails[_indexI].category_id = goal.category_id;
                        existingincomeBudgetDetails[_indexI].budgeted = existingincomeBudgetDetails[_indexI].budgeted + goal.goal_monthly_amount;
                        if (existingincomeBudgetDetails[_indexI].goalId) {
                            existingincomeBudgetDetails[_indexI].goalId = [...new Set([...existingincomeBudgetDetails[_indexI].goalId, docRef.id])]
                        }
                        else {
                            existingincomeBudgetDetails[_indexI] = Object.assign({ goalId: [docRef.id] }, existingincomeBudgetDetails[_indexI])
                        }
                    }
                    else {
                        existingincomeBudgetDetails.push({
                            "category": goal.goal_category,
                            "category_id": goal.category_id,
                            "budgeted": goal.goal_monthly_amount,
                            "goalId": [docRef.id]
                        });
                    }
                    fetchIncomes.update({
                        ['budgetTemplate.budgetTemplateDetails']: existingincomeBudgetDetails
                    }).then(() => {
                        const payChecksRef = fetchIncomes.collection("paychecks");
                        payChecksRef.get().then((snapRef) => {
                            var existingpaycheckBudgetDetails = [];
                            snapRef.docs.forEach((paycheckSnap, _indexP) => {
                                var Mostrecent = [];
                                var snappayCheck = paycheckSnap.data();
                                snapRef.docs.filter(o => {
                                    if (o.data().payDateTimeStamp > snappayCheck.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                        Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                        Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp);
                                        return;
                                    }
                                });
                                if (snappayCheck.payDateTimeStamp >= new Date().getTime() || new Date(snappayCheck.payDateTimeStamp).toDateString() === new Date().toDateString()) {
                                    existingpaycheckBudgetDetails = snappayCheck.budgetDetails;
                                    let gInx = existingpaycheckBudgetDetails.findIndex(o => o.category === goal.goal_category);
                                    if (gInx != -1) {
                                        existingpaycheckBudgetDetails[gInx].budgeted = existingpaycheckBudgetDetails[gInx].budgeted + goal.goal_monthly_amount;
                                        existingpaycheckBudgetDetails[gInx].available = existingpaycheckBudgetDetails[gInx].available + goal.goal_monthly_amount;
                                        if (existingpaycheckBudgetDetails[gInx].goalId) {
                                            existingpaycheckBudgetDetails[gInx].goalId = [...new Set([...existingpaycheckBudgetDetails[gInx].goalId, docRef.id])]
                                        }
                                        else {
                                            existingpaycheckBudgetDetails[gInx] = Object.assign({ goalId: [docRef.id] }, existingpaycheckBudgetDetails[gInx])
                                        }
                                    } else {
                                        existingpaycheckBudgetDetails.push({
                                            "category": goal.goal_category,
                                            "category_id": goal.category_id,
                                            "budgeted": goal.goal_monthly_amount,
                                            "spent": 0,
                                            "available": goal.goal_monthly_amount,
                                            "goalId": [docRef.id],
                                            "transactions": []
                                        })
                                    }
                                    var totalReceived = snappayCheck.totalReceived === 0 ? snappayCheck.totalExpected : snappayCheck.totalReceived
                                    var totalspentAmount = existingpaycheckBudgetDetails.map(o => o.spent).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    var totalBudgetAmount = existingpaycheckBudgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    var totalsurplusAmount = snappayCheck.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    payChecksRef.doc(paycheckSnap.id).update({
                                        budgetsToBeBudgeted: totalReceived - totalBudgetAmount + totalsurplusAmount,
                                        budgetsCurrent: totalBudgetAmount,
                                        isOverbudget: totalReceived - totalBudgetAmount < 0 ? true : false,
                                        budgetDetails: existingpaycheckBudgetDetails
                                    }).then(() => {
                                        if (Mostrecent.length) {
                                            let eInx = Mostrecent[0].budgetDetails.findIndex(o => o.category === goal.goal_category);
                                            if (eInx != -1) {
                                                Mostrecent[0].budgetDetails[eInx].budgeted = Mostrecent[0].budgetDetails[eInx].budgeted + goal.goal_monthly_amount;
                                                Mostrecent[0].budgetDetails[eInx].available = Mostrecent[0].budgetDetails[eInx].available + goal.goal_monthly_amount;
                                                if (Mostrecent[0].budgetDetails[eInx].goalId) {
                                                    Mostrecent[0].budgetDetails[eInx].goalId = [...new Set([...Mostrecent[0].budgetDetails[eInx].goalId, docRef.id])]
                                                }
                                                else {
                                                    Mostrecent[0].budgetDetails[eInx] = Object.assign({ goalId: [docRef.id] }, Mostrecent[0].budgetDetails[eInx])
                                                }
                                            }
                                            else {
                                                Mostrecent[0].budgetDetails.push({
                                                    "category": goal.goal_category,
                                                    "category_id": goal.category_id,
                                                    "budgeted": goal.goal_monthly_amount,
                                                    "spent": 0,
                                                    "available": goal.goal_monthly_amount,
                                                    "goalId": [docRef.id],
                                                    "transactions": []
                                                })
                                            }
                                            let _rindex = Mostrecent[0].rolloverBudgetTemplate.findIndex(o => o.category === goal.goal_category);
                                            if (_rindex != -1) {
                                                Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted = Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted + goal.goal_monthly_amount;
                                                Mostrecent[0].rolloverBudgetTemplate[_rindex].available = Mostrecent[0].rolloverBudgetTemplate[_rindex].available + goal.goal_monthly_amount;
                                            }
                                            else {
                                                Mostrecent[0].rolloverBudgetTemplate.push({
                                                    "category": goal.goal_category,
                                                    "category_id": goal.category_id,
                                                    "budgeted": goal.goal_monthly_amount,
                                                    "spent": 0,
                                                    "available": goal.goal_monthly_amount,
                                                    "goalId": [docRef.id],
                                                    "transactions": []
                                                });
                                            }
                                            var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                            var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                return a + b;
                                            }, 0);
                                            var recentBudgetedAmount = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                return a + b;
                                            }, 0);
                                            var recentsurplusAmount = Mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                return a + b;
                                            }, 0);
                                            incomeRef.doc(goal.goal_incomeSource_Id).collection("paychecks").doc(Mostrecent[0].id).update({
                                                "budgetDetails": Mostrecent[0].budgetDetails,
                                                "surplusBudgetTemplate": Mostrecent[0].surplusBudgetTemplate,
                                                "budgetsCurrent": recentBudgetedAmount,
                                                "rolloverBudgetTemplate": Mostrecent[0].rolloverBudgetTemplate,
                                                "budgetsAvailable": recentReceived - recentspentAmount + recentsurplusAmount,
                                                "isOverspent": (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false,
                                                "budgetsToBeBudgeted": recentReceived - recentBudgetedAmount + recentsurplusAmount,
                                                "isOverbudget": (recentReceived - recentBudgetedAmount + recentsurplusAmount) < 0 ? true : false
                                            }).then(() => {
                                                if (_indexP == snapRef.docs.length - 1) {
                                                    return res.status(200).send({
                                                        success: true,
                                                        message: "goal category added in income source"
                                                    });
                                                }
                                            });

                                        }
                                        else {
                                            if (_indexP == snapRef.docs.length - 1) {
                                                return res.status(200).send({
                                                    success: true,
                                                    message: "goal category added in income source"
                                                });
                                            }
                                        }
                                    })
                                }
                                else {
                                    if (_indexP == snapRef.docs.length - 1) {
                                        return res.status(200).send({
                                            success: true,
                                            message: "goal category added in income source"
                                        });
                                    }
                                }
                            });
                        }).catch((err) => {
                            return res.status(400).send({ success: false, error: "paychecks not update properly" });
                        });
                    }).catch((err) => {
                        return res.status(400).send({ success: false, error: "income not update properly" });
                    })
                }).catch((err) => {
                    return res.status(400).send({ success: false, error: "income not update properly" });
                })
            }).catch(function (er) {
                return res.status(400).send({ success: false, error: er });
            });
        }
        else {
            users.collection('goals').add(goal).then(function () {
                return res.status(200).send({
                    success: true,
                    message: "goal is added"
                });
            }).catch(function (er) {
                return res.status(400).send({ success: false, error: er });
            });
        }
    })
});

exports.transaction = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        const data = req.body;
        let error = [];
        const transRef = admin.firestore().collection("user_transaction").doc(data.userId).collection("transactions");
        const incomeRef = admin.firestore().collection("income_source").doc(data.userId).collection("incomes");
        const goalRef = admin.firestore().collection("users").doc(data.userId).collection("goals");
        data.category = data.category ? data.category : ["miscellaneous"];
        const category_id = data.category_id;
        transRef.add({
            "name": data.name,
            "category_id": data.category_id,
            "category": data.category,
            "transactionDateTime": data.transactionDateTime ? new Date(data.transactionDateTime) : new Date(),
            "transactionDateTimeStamp": data.transactionDateTime ? new Date(data.transactionDateTime).getTime() : new Date().getTime(),
            "amount": data.amount,
            "assignment": data.assignment,
            "type": data.type
        }).then(function (transResult) {
            let count = 0;
            let transId = transResult.id;
            if (data.assignment.length == 0) {
                return res.status(200).send({
                    success: true
                });
            }
            else {
                //-----------------Income---------------------
                if (data.type.toLowerCase() == "income") {
                    updateIncomePaycheks(data.assignment[count], transId);
                    function updateIncomePaycheks(i, transId) {
                        incomeRef.where("paycheckIds", "array-contains", i.paycheckId).get().then((snap) => {
                            if (snap.docs.length === 0) {
                                error.push(`paycheck id not exists: ${i.paycheckId}`);
                                count++;
                                if (count == data.assignment.length) {
                                    return res.status(200).send({
                                        success: true,
                                        message: error
                                    });
                                } else {
                                    updateIncomePaycheks(data.assignment[count], transId);
                                }
                            } else {
                                const incomeSourceId = snap.docs[0].id;
                                const paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(i.paycheckId);
                                paycheckGet.get().then((snapPayCheckReq) => {
                                    var paycheckData = snapPayCheckReq.data();
                                    var totalReceived = paycheckData.totalReceived === 0 ? Math.abs(i.amount) : paycheckData.totalReceived + Math.abs(i.amount)
                                    var totalspentAmount = paycheckData.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    var totalBudgetAmount = paycheckData.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    var totalsurplusAmount = paycheckData.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    paycheckGet.update({
                                        totalReceived: admin.firestore.FieldValue.increment(i.amount),
                                        receivedPaycheckTransaction: admin.firestore.FieldValue.arrayUnion(transId),
                                        budgetsAvailable: totalReceived - totalspentAmount + totalsurplusAmount,
                                        budgetsCurrent: totalBudgetAmount,
                                        budgetsToBeBudgeted: totalReceived - totalBudgetAmount + totalsurplusAmount,
                                        isOverbudget: (totalReceived - totalBudgetAmount + totalsurplusAmount) < 0 ? true : false,
                                        isOverspent: (totalReceived - totalspentAmount + totalsurplusAmount) < 0 ? true : false
                                    }).then(() => {
                                        let Mostrecent = [];
                                        incomeRef.doc(incomeSourceId).collection("paychecks").get().then((query) => {
                                            query.docs.filter(o => {
                                                if (o.data().payDateTimeStamp > paycheckData.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                    Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                                    Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                    return;
                                                }
                                            });
                                            if (Mostrecent.length) {
                                                var surplusBudgetTemplate = [];
                                                surplusBudgetTemplate = Mostrecent[0].surplusBudgetTemplate;

                                                var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                                var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                var recentbudgetedAmount = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                var recentsurplusAmount = surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                incomeRef.doc(incomeSourceId).collection("paychecks").doc(Mostrecent[0].id).update({
                                                    "surplusBudgetTemplate": surplusBudgetTemplate,
                                                    "budgetsToBeBudgeted": recentReceived - recentbudgetedAmount + recentsurplusAmount,
                                                    "budgetsCurrent": recentbudgetedAmount,
                                                    "isOverbudget": (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                    "budgetsAvailable": recentReceived - recentspentAmount + recentsurplusAmount,
                                                    "isOverspent": (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                }).then(() => {
                                                    count++;
                                                    if (count === data.assignment.length) {
                                                        return res.status(200).send({
                                                            success: true,
                                                            message: "Update paycheck budhget!!"
                                                        });

                                                    } else {
                                                        updateIncomePaycheks(data.assignment[count], transId);

                                                    }
                                                }).catch(e => {
                                                    count++;
                                                    if (count === data.assignment.length) {
                                                        return res.status(200).send({
                                                            success: true,
                                                            message: "Update paycheck budhget!!"
                                                        });

                                                    } else {
                                                        updateIncomePaycheks(data.assignment[count], transId);

                                                    }
                                                });
                                            }
                                            else {
                                                count++;
                                                if (count === data.assignment.length) {
                                                    return res.status(200).send({
                                                        success: true,
                                                        message: "Update paycheck budhget!!"
                                                    });

                                                } else {
                                                    updateIncomePaycheks(data.assignment[count], transId);

                                                }
                                            }
                                        })
                                    })
                                })

                            }
                        })
                    }
                }
                else {
                    //-----------------Expense---------------------
                    updatePaycheks(data.assignment[count], transId);
                    function updatePaycheks(i, transId) {
                        incomeRef.where("paycheckIds", "array-contains", i.paycheckId).get().then((snap) => {
                            if (snap.docs.length === 0) {
                                error.push(`paycheck id not exists: ${i.paycheckId}`);
                                count++;
                                if (count == data.assignment.length) {

                                    return res.status(200).send({
                                        success: true,
                                        message: "paycheck id not exists"
                                    });
                                } else {
                                    updatePaycheks(data.assignment[count], transId);
                                }
                            } else {
                                const incomeSourceId = snap.docs[0].id;
                                const paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(i.paycheckId);
                                paycheckGet.get().then((snapPayCheckReq) => {
                                    var paycheckData = snapPayCheckReq.data();
                                    var existingBudgetDetails = paycheckData.budgetDetails;
                                    let index = existingBudgetDetails.findIndex(o => o.category == data.category);
                                    if (index != -1) {
                                        existingBudgetDetails[index].spent = existingBudgetDetails[index].spent + Math.abs(i.amount);
                                        existingBudgetDetails[index].available = existingBudgetDetails[index].available - Math.abs(i.amount);
                                        if (existingBudgetDetails[index].transactions && existingBudgetDetails[index].transactions.length) {
                                            existingBudgetDetails[index].transactions.push(transId);
                                        }
                                        else {
                                            existingBudgetDetails[index].transactions = [transId]
                                        }
                                    }
                                    else {
                                        existingBudgetDetails.push({
                                            "category": data.category,
                                            "category_id": data.category_id,
                                            "budgeted": 0,
                                            "spent": i.amount,
                                            "available": -i.amount,
                                            "transactions": [transId]
                                        })
                                    }
                                    var totalReceived = paycheckData.totalReceived === 0 ? paycheckData.totalExpected : paycheckData.totalReceived;
                                    var totalspentAmount = existingBudgetDetails.map(o => o.spent).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    var totalbudgetedAmount = existingBudgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    var totalsurplusAmount = paycheckData.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                        return a + b;
                                    }, 0);
                                    paycheckGet.update({
                                        budgetDetails: existingBudgetDetails,
                                        budgetsCurrent: totalbudgetedAmount,
                                        budgetsToBeBudgeted: totalReceived - totalbudgetedAmount + totalsurplusAmount,
                                        isOverbudget: totalReceived - totalbudgetedAmount + totalsurplusAmount < 0 ? true : false,
                                        budgetsAvailable: totalReceived - totalspentAmount + totalsurplusAmount,
                                        isOverspent: totalReceived - totalspentAmount + totalsurplusAmount < 0 ? true : false
                                    }).then(() => {
                                        let Mostrecent = [];
                                        incomeRef.doc(incomeSourceId).collection("paychecks").get().then((query) => {
                                            query.docs.filter(o => {
                                                if (o.data().payDateTimeStamp > paycheckData.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                    Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                                    Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                    return;
                                                }
                                            });
                                            if (Mostrecent.length) {
                                                let eindx = existingBudgetDetails.findIndex(o => (o.category) == (data.category));
                                                if (eindx != -1) {
                                                    let indx = Mostrecent[0].budgetDetails.findIndex(o => (o.category) == (data.category));
                                                    if (indx != -1) {
                                                        Mostrecent[0].budgetDetails[indx].available = (Mostrecent[0].budgetDetails[indx].available - i.amount);
                                                        Mostrecent[0].budgetDetails[indx].budgeted = Mostrecent[0].budgetDetails[indx].budgeted - i.amount;
                                                    }
                                                    else {
                                                        Mostrecent[0].budgetDetails.push({
                                                            "category": data.category,
                                                            "category_id": data.category_id,
                                                            "budgeted": -i.amount,
                                                            "spent": 0,
                                                            "available": -i.amount,
                                                            "transactions": []
                                                        })
                                                    }
                                                    let _rindex = Mostrecent[0].rolloverBudgetTemplate.findIndex(o => o.category === data.category);
                                                    if (_rindex != -1) {
                                                        Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted = Mostrecent[0].rolloverBudgetTemplate[_rindex].budgeted - i.amount;
                                                        Mostrecent[0].rolloverBudgetTemplate[_rindex].available = Mostrecent[0].rolloverBudgetTemplate[_rindex].available - i.amount;
                                                    }
                                                    else {
                                                        Mostrecent[0].rolloverBudgetTemplate.push({
                                                            "category": data.category,
                                                            "category_id": data.category_id,
                                                            "budgeted": -i.amount,
                                                            "spent": 0,
                                                            "available": -i.amount,
                                                            "transactions": []
                                                        });
                                                    }
                                                }
                                                var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                                                var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                var recentbudgetedAmount = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                var recentsurplusAmount = Mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                    return a + b;
                                                }, 0);
                                                incomeRef.doc(incomeSourceId).collection("paychecks").doc(Mostrecent[0].id).update({
                                                    budgetDetails: Mostrecent[0].budgetDetails,
                                                    budgetsToBeBudgeted: (recentReceived - recentbudgetedAmount) + recentsurplusAmount,
                                                    budgetsCurrent: recentbudgetedAmount,
                                                    rolloverBudgetTemplate: Mostrecent[0].rolloverBudgetTemplate,
                                                    budgetsAvailable: (recentReceived - recentspentAmount) + recentsurplusAmount,
                                                    surplusBudgetTemplate: Mostrecent[0].surplusBudgetTemplate,
                                                    isOverbudget: ((recentReceived - recentbudgetedAmount) + recentsurplusAmount) < 0 ? true : false,
                                                    isOverspent: recentReceived - recentspentAmount + recentsurplusAmount < 0 ? true : false
                                                }).then(() => {
                                                    updateGoals(i.amount);
                                                }).catch(e => {
                                                    count++;
                                                    if (count === data.assignment.length) {
                                                        return res.status(200).send({
                                                            success: true,
                                                            message: "paycheck budget updates"
                                                        });

                                                    } else {
                                                        updatePaycheks(data.assignment[count], transId);

                                                    }
                                                });
                                            }
                                            else {
                                                updateGoals(i.amount);
                                            }
                                        });
                                        function updateGoals(amount) {
                                            count++;
                                            goalRef.where("goal_incomeSource_Id", "==", incomeSourceId).get().then((snap) => {
                                                if (snap.docs.length) {
                                                    var increase = 0;
                                                    snap.docs.forEach(goal => {
                                                        increase++;
                                                        if (goal.data().category_id === category_id) {
                                                            var goalData = goal.data();
                                                            if (goalData.goal_type === "saving") {
                                                                goalData.left_amount = goalData.left_amount - Math.abs(amount);
                                                                goalData.paid_amount = goalData.paid_amount + Math.abs(amount);
                                                                goalData.isAccomplished = (goalData.paid_amount >= goalData.goal_amount) ? true : false;
                                                                if (goalData.paid_amount >= goalData.goal_amount) {
                                                                    goalData.left_amount = 0;
                                                                }
                                                                calculateDate(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                                    goalData.goal_endDate = date;
                                                                    goalRef.doc(goal.id).update({
                                                                        left_amount: goalData.left_amount,
                                                                        paid_amount: goalData.paid_amount,
                                                                        goal_endDate: goalData.goal_endDate,
                                                                        isAccomplished: goalData.isAccomplished
                                                                    });
                                                                });
                                                            }
                                                            else {
                                                                goalData.left_amount = goalData.left_amount - Math.abs(amount);
                                                                goalData.paid_amount = goalData.paid_amount + Math.abs(amount);
                                                                goalData.isAccomplished = (goalData.paid_amount >= goalData.goal_amount) ? true : false;
                                                                if (goalData.paid_amount >= goalData.goal_amount) {
                                                                    goalData.left_amount = 0;
                                                                }
                                                                calculateTarget(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                                                                    goalData.goal_endDate = date;
                                                                    goalRef.doc(goal.id).update({
                                                                        left_amount: goalData.left_amount,
                                                                        paid_amount: goalData.paid_amount,
                                                                        goal_endDate: goalData.goal_endDate,
                                                                        isAccomplished: goalData.isAccomplished
                                                                    });
                                                                });
                                                            }
                                                        }
                                                        if (increase === snap.docs.length) {
                                                            if (count === data.assignment.length) {
                                                                return res.status(200).send({
                                                                    success: true,
                                                                    message: "paycheck budget updates"
                                                                });

                                                            } else {
                                                                updatePaycheks(data.assignment[count], transId);

                                                            }
                                                        }
                                                    });

                                                }
                                                else {
                                                    if (count === data.assignment.length) {
                                                        return res.status(200).send({
                                                            success: true,
                                                            message: "paycheck budget updates"
                                                        });

                                                    } else {
                                                        updatePaycheks(data.assignment[count], transId);

                                                    }
                                                }


                                            })

                                        }

                                    })

                                })
                            }
                        })
                    }

                }

            }

        }).catch(function (error) {
            res.status(400).send({
                success: false,
                logLevel: 1,
                error: JSON.stringify(error)
            });
        });
    });
});