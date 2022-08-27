import { Injectable } from "@angular/core";
import * as firebase from 'firebase';
import * as moment from "moment";
import DateDiff from "./date-diff";
import { LogoutService } from "../logout/logout.service";
import { TransactionService } from "../transaction/transaction.service";
import { CommonProvider } from "src/providers/common";
import { LoadingController } from "@ionic/angular";

// var DateDiff = require('date-diff');
var client;
const admin = firebase;
@Injectable({
    providedIn: 'root'
})

export class FirebaseFunctionLocal {
    /**
     * @variables here we add our variable and import class
     */
    public logoutService: LogoutService;
    public transService: TransactionService;
    private cp: CommonProvider;
    private loadCtrl: LoadingController;
    /**
     * @functionSection here all firebase function
     */
    budgetAllocation(body) {
        // const data = request.body;
        return new Promise((resolve, reject) => {
            const data = body;
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
                            // console.log("apply for all");
                            let paycheckPromises = [];
                            const payChecksRef = fetchIncomes.collection("paychecks");
                            payChecksRef.get().then((snapRef) => {
                                snapRef.docs.map(o => paycheckPromises.push({ paycheck: Object.assign({ id: o.id }, o.data()) }))
                                if (paycheckPromises.length) {
                                    let count = 0;
                                    // console.log("checking counter is work properly????", count)
                                    paycheckPromises.sort((a, b) => a.paycheck.payDateTimeStamp - a.paycheck.payDateTimeStamp);
                                    assignTopaycheck(paycheckPromises[count].paycheck);
                                    function assignTopaycheck(paycheck) {
                                        count++;
                                        let existingpaycheckBudgetDetails = paycheck.budgetDetails;
                                        let totalBudgeted = 0;
                                        let budgetTmp_index = 0;
                                        let totalReceived, totalspentAmount, totalbudgetedAmount, totalsurplusAmount = 0;
                                        data.budgetTemplate.forEach((i) => {
                                            if (budgetTmp_index < data.budgetTemplate.length) {
                                                totalBudgeted = totalBudgeted + i.budgeted;
                                                let index = paycheck.budgetDetails.findIndex(o => o.category === i.category);
                                                if (index != -1) {
                                                    paycheck.budgetDetails[index].budgeted = paycheck.budgetDetails[index].budgeted + i.budgeted;
                                                    paycheck.budgetDetails[index].available = paycheck.budgetDetails[index].available + i.budgeted;
                                                }
                                                else {
                                                    paycheck.budgetDetails.push({
                                                        "category": i.category,
                                                        "category_id": i.category_id,
                                                        "budgeted": i.budgeted,
                                                        "spent": 0,
                                                        "available": i.budgeted,
                                                        "transactions": []
                                                    });
                                                }
                                                if (budgetTmp_index === (data.budgetTemplate.length - 1)) {
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
                                                        budgetDetails: paycheck.budgetDetails,
                                                        budgetsToBeBudgeted: totalReceived - totalbudgetedAmount + totalsurplusAmount,
                                                        budgetsCurrent: totalbudgetedAmount,
                                                        isOverbudget: (totalReceived - totalbudgetedAmount + totalsurplusAmount) < 0 ? true : false,
                                                    }).then(async () => {
                                                        await budgetallocationLoop(paycheck, paycheck.budgetDetails);
                                                    }).catch(async () => {
                                                        // console.log("checking counter is work properly???? in catch", count)
                                                        if (paycheckPromises.length > count) {
                                                            assignTopaycheck(paycheckPromises[count].paycheck);
                                                        }
                                                        else {
                                                            resolve({ success: true });
                                                        }
                                                    });
                                                    function budgetallocationLoop(paycheck, existingpaycheckBudgetDetails) {
                                                        if (paycheck && existingpaycheckBudgetDetails) {
                                                            var Mostrecent = [];
                                                            payChecksRef.get().then((snapallReq) => {
                                                                snapallReq.docs.filter(o => {
                                                                    if (o.data().payDateTimeStamp > paycheck.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                                                                        Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                                                                        Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                                                                        return;
                                                                    }
                                                                });
                                                                if (Mostrecent.length) {

                                                                    if (Mostrecent.length == 1) {
                                                                        let sIndx = Mostrecent[0].surplusBudgetTemplate.findIndex(o => (o.paycheckId) === (paycheck.id));
                                                                        if (sIndx != -1) {
                                                                            Mostrecent[0].surplusBudgetTemplate[sIndx].amount = paycheck.budgetsAvailable;
                                                                        }
                                                                        else {
                                                                            Mostrecent[0].surplusBudgetTemplate.push({
                                                                                paycheckId: paycheck.id,
                                                                                amount: paycheck.budgetsAvailable
                                                                            });
                                                                        }
                                                                        let mostbudgetTmp_index = 0;
                                                                        data.budgetTemplate.forEach((i) => {
                                                                            if (mostbudgetTmp_index < data.budgetTemplate.length) {
                                                                                let eIndex = existingpaycheckBudgetDetails.findIndex(o => o.category === i.category);
                                                                                if (eIndex != -1) {
                                                                                    // console.log('index from the paycheck budget', eIndex);
                                                                                    let _index = Mostrecent[0].budgetDetails.findIndex(o => o.category === i.category);
                                                                                    // console.log("we go the budget amount", existingpaycheckBudgetDetails[eIndex].available, paycheck.name)
                                                                                    if (_index != -1) {
                                                                                        console.log("available amount", Mostrecent[0].budgetDetails[_index].available)
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
                                                                                }
                                                                                if (budgetTmp_index === (data.budgetTemplate.length - 1)) {
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
                                                                                        surplusBudgetTemplate: Mostrecent[0].surplusBudgetTemplate,
                                                                                        budgetsAvailable: (recentReceived - recentspentAmount) + recentsurplusAmount,
                                                                                        isOverbudget: (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                                                        isOverspent: (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                                                    }).then(() => {
                                                                                        if (paycheckPromises.length > count) {
                                                                                            assignTopaycheck(paycheckPromises[count].paycheck);
                                                                                        }
                                                                                        else {
                                                                                            resolve({ success: true });
                                                                                        }
                                                                                    }).catch(err => {

                                                                                        if (paycheckPromises.length > count) {
                                                                                            assignTopaycheck(paycheckPromises[count].paycheck);
                                                                                        }
                                                                                        else {
                                                                                            resolve({ success: true });
                                                                                        }
                                                                                    })
                                                                                }
                                                                                else {
                                                                                    mostbudgetTmp_index++;
                                                                                }
                                                                            }

                                                                        })
                                                                    }
                                                                    else {
                                                                        var mostPaycheckCounter = 0;
                                                                        const totalMostRecent = Mostrecent.length;
                                                                        mostrecentBudgetCalculation(paycheck);
                                                                        function mostrecentBudgetCalculation(paycheckRec) {
                                                                            mostPaycheckCounter++;
                                                                            if (Mostrecent[Mostrecent.length - mostPaycheckCounter]) {
                                                                                var currentPaycheck = Mostrecent[Mostrecent.length - mostPaycheckCounter];
                                                                                let sIndx = currentPaycheck.surplusBudgetTemplate.findIndex(o => (o.paycheckId) === (paycheckRec.id));
                                                                                if (sIndx != -1) {
                                                                                    currentPaycheck.surplusBudgetTemplate[sIndx].amount = paycheckRec.budgetsAvailable;
                                                                                }
                                                                                else {
                                                                                    currentPaycheck.surplusBudgetTemplate.push({
                                                                                        paycheckId: paycheckRec.id,
                                                                                        amount: paycheckRec.budgetsAvailable
                                                                                    });
                                                                                }
                                                                                let mostbudgetTmp_index = 0;
                                                                                data.budgetTemplate.forEach((i) => {
                                                                                    if (mostbudgetTmp_index < data.budgetTemplate.length) {
                                                                                        let eIndex = paycheckRec.budgetDetails.findIndex(o => o.category === i.category);
                                                                                        if (eIndex != -1) {
                                                                                            // console.log('index from the paycheck budget', eIndex);
                                                                                            let _index = currentPaycheck.budgetDetails.findIndex(o => o.category === i.category);
                                                                                            // console.log("we go the budget amount", existingpaycheckBudgetDetails[eIndex].available, paycheck.name)
                                                                                            if (_index != -1) {
                                                                                                console.log("available amount", currentPaycheck.budgetDetails[_index].available)
                                                                                                currentPaycheck.budgetDetails[_index].budgeted = currentPaycheck.budgetDetails[_index].budgeted + paycheckRec.budgetDetails[eIndex].available;
                                                                                                currentPaycheck.budgetDetails[_index].available = currentPaycheck.budgetDetails[_index].available + paycheckRec.budgetDetails[eIndex].available;
                                                                                            }
                                                                                            else {
                                                                                                currentPaycheck.budgetDetails.push({
                                                                                                    "category": i.category,
                                                                                                    "category_id": i.category_id,
                                                                                                    "budgeted": paycheckRec.budgetDetails[eIndex].available,
                                                                                                    "spent": 0,
                                                                                                    "available": paycheckRec.budgetDetails[eIndex].available,
                                                                                                    "transactions": []
                                                                                                });
                                                                                            }
                                                                                        }
                                                                                        if (budgetTmp_index === (data.budgetTemplate.length - 1)) {
                                                                                            var recentReceived = currentPaycheck.totalReceived === 0 ? currentPaycheck.totalExpected : currentPaycheck.totalReceived;
                                                                                            var recentspentAmount = currentPaycheck.budgetDetails.map(o => o.spent).reduce(function (a, b) {
                                                                                                return a + b;
                                                                                            }, 0);
                                                                                            var recentbudgetedAmount = currentPaycheck.budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                                                                                                return a + b;
                                                                                            }, 0);
                                                                                            var recentsurplusAmount = currentPaycheck.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                                                                                                return a + b;
                                                                                            }, 0);
                                                                                            currentPaycheck.budgetsToBeBudgeted = (recentReceived - recentbudgetedAmount) + recentsurplusAmount;
                                                                                            currentPaycheck.budgetsCurrent = recentbudgetedAmount;
                                                                                            currentPaycheck.budgetsAvailable = (recentReceived - recentspentAmount) + recentsurplusAmount;
                                                                                            currentPaycheck.isOverbudget = (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false;
                                                                                            currentPaycheck.isOverspent = (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false;

                                                                                            payChecksRef.doc(currentPaycheck.id).update({
                                                                                                budgetDetails: currentPaycheck.budgetDetails,
                                                                                                budgetsToBeBudgeted: (recentReceived - recentbudgetedAmount) + recentsurplusAmount,
                                                                                                budgetsCurrent: recentbudgetedAmount,
                                                                                                surplusBudgetTemplate: currentPaycheck.surplusBudgetTemplate,
                                                                                                budgetsAvailable: (recentReceived - recentspentAmount) + recentsurplusAmount,
                                                                                                isOverbudget: (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                                                                isOverspent: (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                                                                            }).then(() => {
                                                                                                let findIndex = paycheckPromises.findIndex(o => o.paycheck.id === currentPaycheck);
                                                                                                if (findIndex != -1) {
                                                                                                    paycheckPromises[findIndex].paycheck = currentPaycheck;
                                                                                                }
                                                                                                if (mostPaycheckCounter == totalMostRecent) {
                                                                                                    if (paycheckPromises.length > count) {
                                                                                                        assignTopaycheck(paycheckPromises[count].paycheck);
                                                                                                    }
                                                                                                    else {
                                                                                                        resolve({ success: true });
                                                                                                    }
                                                                                                }
                                                                                                else {

                                                                                                    mostrecentBudgetCalculation(currentPaycheck);
                                                                                                }

                                                                                            }).catch(err => {
                                                                                                let findIndex = paycheckPromises.findIndex(o => o.paycheck.id === currentPaycheck);
                                                                                                if (findIndex != -1) {
                                                                                                    paycheckPromises[findIndex].paycheck = currentPaycheck;
                                                                                                }
                                                                                                if (mostPaycheckCounter == totalMostRecent) {
                                                                                                    if (paycheckPromises.length > count) {
                                                                                                        assignTopaycheck(paycheckPromises[count].paycheck);
                                                                                                    }
                                                                                                    else {
                                                                                                        resolve({ success: true });
                                                                                                    }
                                                                                                }
                                                                                                else {

                                                                                                    mostrecentBudgetCalculation(currentPaycheck);
                                                                                                }

                                                                                            })
                                                                                        }
                                                                                        else {
                                                                                            mostbudgetTmp_index++;
                                                                                        }
                                                                                    }
                                                                                    else {
                                                                                        let findIndex = paycheckPromises.findIndex(o => o.paycheck.id === currentPaycheck);
                                                                                        if (findIndex != -1) {
                                                                                            paycheckPromises[findIndex].paycheck = currentPaycheck;
                                                                                        }
                                                                                        if (mostPaycheckCounter == totalMostRecent) {
                                                                                            if (paycheckPromises.length > count) {
                                                                                                assignTopaycheck(paycheckPromises[count].paycheck);
                                                                                            }
                                                                                            else {
                                                                                                resolve({ success: true });
                                                                                            }
                                                                                        }
                                                                                        else {
                                                                                            mostrecentBudgetCalculation(currentPaycheck);
                                                                                        }

                                                                                    }
                                                                                })
                                                                            }
                                                                            else {
                                                                                if (paycheckPromises.length > count) {
                                                                                    assignTopaycheck(paycheckPromises[count].paycheck);
                                                                                }
                                                                                else {
                                                                                    resolve({ success: true });
                                                                                }
                                                                            }
                                                                        }
                                                                    }



                                                                }
                                                                else {
                                                                    if (paycheckPromises.length > count) {
                                                                        assignTopaycheck(paycheckPromises[count].paycheck);
                                                                    }
                                                                    else {
                                                                        resolve({ success: true });
                                                                    }
                                                                }
                                                            }).catch(err => {
                                                                if (paycheckPromises.length > count) {
                                                                    assignTopaycheck(paycheckPromises[count].paycheck);
                                                                }
                                                                else {
                                                                    resolve({ success: true });
                                                                }
                                                            })
                                                        }
                                                        else {

                                                            resolve({ success: true });

                                                        }
                                                    }
                                                }
                                                else {
                                                    budgetTmp_index++;
                                                }
                                            }


                                        });

                                    }
                                }
                            });
                        }
                        else {
                            console.log("apply for all is false")
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
                                            let sIndx = Mostrecent[0].surplusBudgetTemplate.findIndex(o => (o.paycheckId) === (data.paycheckId));
                                            if (sIndx != -1) {
                                                Mostrecent[0].surplusBudgetTemplate[sIndx].amount = totalReceived - totalspentAmount + totalsurplusAmount;
                                            }
                                            else {
                                                Mostrecent[0].surplusBudgetTemplate.push({
                                                    paycheckId: data.paycheckId,
                                                    amount: totalReceived - totalspentAmount + totalsurplusAmount
                                                });
                                            }
                                            data.budgetTemplate.forEach(function (i) {
                                                let eIndex = existingpaycheckBudgetDetails.findIndex(o => o.category === i.category);
                                                if (eIndex != -1) {
                                                    console.log(`budget categories from paycheck ${data.paycheckId}`, i.category, existingpaycheckBudgetDetails[eIndex].available)
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
                                                isOverbudget: (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                                surplusBudgetTemplate: Mostrecent[0].surplusBudgetTemplate,
                                                budgetsAvailable: recentReceived - recentspentAmount + recentsurplusAmount,
                                                isOverspent: (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                            }).then(() => {

                                                incomeRef.doc(incomeSourceId).update({
                                                    ['budgetTemplate.budgetsToBeBudgeted']: admin.firestore.FieldValue.increment(-totalBudgeted)
                                                }).then(() => {
                                                    console.log("we breaking the operation");
                                                    // return response.status(200).send({
                                                    //     success: true,
                                                    //     message: "Template Update"
                                                    // });
                                                });
                                            }).catch(() => {
                                                incomeRef.doc(incomeSourceId).update({
                                                    ['budgetTemplate.budgetsToBeBudgeted']: admin.firestore.FieldValue.increment(-totalBudgeted)
                                                }).then(() => {
                                                    console.log("we breaking the operation");
                                                    // return response.status(200).send({
                                                    //     success: true,
                                                    //     message: "Template Update"
                                                    // });
                                                });
                                            });
                                        }
                                        else {
                                            incomeRef.doc(incomeSourceId).update({
                                                ['budgetTemplate.budgetsToBeBudgeted']: admin.firestore.FieldValue.increment(-totalBudgeted)
                                            }).then(() => {
                                                console.log("we breaking the operation");
                                                // return response.status(200).send({
                                                //     success: true,
                                                //     message: "Template Update"
                                                // });
                                            });
                                        }
                                    });

                                })
                            })

                        }
                    })
                }).catch((err) => {
                    console.log("we breaking the operation");
                    // return response.status(400).send({
                    //     success: false,
                    //     message: JSON.stringify(err)
                    // });
                })
            }
            else if (data.incomeSourceId == null && data.paycheckId != null && !data.budgetTemplateUpdate) {
                const fetchIncomes = incomeRef.where("paycheckIds", "array-contains", data.paycheckId)
                fetchIncomes.get().then((snap) => {
                    if (snap.docs.length === 0) {
                        console.log("we breaking the operation");
                        // return response.status(200).send({
                        //     success: true,
                        //     message: "No paychecks exists"
                        // });
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
                                    let sIndx = Mostrecent[0].surplusBudgetTemplate.findIndex(o => o.paycheckId === data.paycheckId);
                                    if (sIndx != -1) {
                                        Mostrecent[0].surplusBudgetTemplate[sIndx].amount = totalReceived - totalspentAmount + totalsurplusAmount;
                                    }
                                    else {
                                        Mostrecent[0].surplusBudgetTemplate.push({
                                            paycheckId: data.paycheckId,
                                            amount: totalReceived - totalspentAmount + totalsurplusAmount
                                        });
                                    }
                                    data.budgetTemplate.forEach(function (i) {
                                        let eIndex = existingpaycheckBudgetDetails.findIndex(o => o.category === i.category);
                                        if (eIndex != -1) {
                                            console.log(`budget categories from paycheck ${data.paycheckId}`, i.category, existingpaycheckBudgetDetails[eIndex].available)
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
                                        budgetsAvailable: recentReceived - recentspentAmount + recentsurplusAmount,
                                        isOverbudget: (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                                        surplusBudgetTemplate: Mostrecent[0].surplusBudgetTemplate,
                                        isOverspent: (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                                    }).then(() => {
                                        incomeRef.doc(incomeSourceId).update({
                                            ['budgetTemplate.budgetsToBeBudgeted']: admin.firestore.FieldValue.increment(-totalBudgeted)
                                        }).then(() => {
                                            // return response.status(200).send({
                                            //     success: true,
                                            //     message: "Template Update"
                                            // });
                                        });
                                    }).catch((err) => {
                                        incomeRef.doc(incomeSourceId).update({
                                            ['budgetTemplate.budgetsToBeBudgeted']: admin.firestore.FieldValue.increment(-totalBudgeted)
                                        }).then(() => {
                                            // return response.status(200).send({
                                            //     success: true,
                                            //     message: "Template Update but the mostrecent has an error"
                                            // });
                                        });
                                    });
                                }
                                else {
                                    incomeRef.doc(incomeSourceId).update({
                                        ['budgetTemplate.budgetsToBeBudgeted']: admin.firestore.FieldValue.increment(-totalBudgeted)
                                    }).then(() => {
                                        // return response.status(200).send({
                                        //     success: true,
                                        //     message: "Template Update"
                                        // });
                                    });
                                }
                            })

                        })
                    })
                })
            }
            else {
                console.log("we breaking the operation");
                // return response.status(200).send({
                //     success: false,
                //     message: "Invalid Request"
                // });
            }

        })
    }
    dailyFetchTransaction() {
        const usersRef = admin.firestore().collection("accounts").where("active", "==", true);
        usersRef.get().then(async (snapUsers) => {
            var userpromises = [];
            if (snapUsers.docs.length) {
                userpromises = snapUsers.docs.map(o => o.id);
                function runnallQueriesParallel(uid) {
                    const user_ID = uid;
                    console.log("-------------------------------------userId:" + uid + "---------------------------------------------------")
                    admin.firestore().collection("accounts").doc(user_ID).collection('bank_account').get().then((childsnap) => {
                        console.log("bank accounts in DB", childsnap.docs.length)
                        if (childsnap.docs.length) {
                            childsnap.docs.forEach((bank, _bankCount) => {
                                const account_token = bank.data().accounts_tokens;
                                const bank_Type = bank.data().type;
                                if (account_token && bank.data().hasPermission == true) {
                                    console.log("bank accounts in access token", account_token)
                                    var today = new Date();
                                    var recurrTillDate = today.setDate(today.getDate() - 7);
                                    var startDate = new Date().toISOString().substring(0, 10);
                                    var endDate = new Date(recurrTillDate).toISOString().substring(0, 10);
                                    client.getTransactions(account_token, endDate, startDate, {
                                    }, async (err, result) => {
                                        if (!err && result && result.transactions.length) {
                                            var promises = [];
                                            const transRef = admin.firestore().collection("user_plaid_transaction").doc(user_ID).collection("transactions");
                                            const incomeRef = admin.firestore().collection("income_source").doc(user_ID).collection("incomes");
                                            const usrtransRef = admin.firestore().collection("user_transaction").doc(user_ID).collection("transactions");
                                            const goalRef = admin.firestore().collection('users').doc(user_ID).collection('goals')
                                            const existing_ac_transaction = result.transactions.filter(x => x.account_id === bank.id);
                                            const all_transactions = existing_ac_transaction.filter((v, i, a) => a.findIndex(t => (t.account_id === v.account_id && t.name === v.name && t.merchant_name === v.merchant_name && t.date === v.date && t.category_id === v.category_id && t.transaction_type === v.transaction_type)) === i);
                                            const transactions = all_transactions;
                                            var counter = 0;
                                            console.log("all_transactions", all_transactions.length)
                                            all_transactions.forEach(async (trans, _icount) => {
                                                console.log(user_ID, _icount);
                                                promises.push(transRef.doc(trans.transaction_id).set(Object.assign({ "active_transaction": true, "bank_Type": bank_Type }, trans), { merge: true }));
                                                if (promises.length && _icount === (all_transactions.length - 1)) {
                                                    await Promise.all(promises)
                                                        .then(() => {
                                                            console.log("second promise then is calling...");
                                                            transRef.where("account_id", "==", bank.id).get().then((snapShots) => {
                                                                if (snapShots.docs.length) {
                                                                    snapShots.docs.forEach((transa, _tranxCount) => {
                                                                        result.transactions.forEach(function (v, _resultCount) {
                                                                            if (transa.data().account_id === v.account_id && transa.data().name === v.name && transa.data().merchant_name === v.merchant_name && transa.data().date === v.date && transa.data().category_id === v.category_id && transa.data().transaction_type === v.transaction_type) {
                                                                                let amountleft = transa.data().remainingAmount ? v.amount - transa.data().amount : v.amount
                                                                                transRef.doc(trans.transaction_id).update({
                                                                                    amount: v.amount,
                                                                                    remainingAmount: amountleft
                                                                                }).then(() => {
                                                                                    if (_resultCount === (result.transactions.length) && _tranxCount === (snapShots.docs.length - 1)) {
                                                                                        console.log("inner result transactions updated transaction", _tranxCount);
                                                                                    }
                                                                                }).catch((err) => {
                                                                                    console.log("updated transaction error", err);
                                                                                });
                                                                            }
                                                                        })
                                                                    });
                                                                }
                                                            }).catch((err) => {
                                                                console.log("get transaction using bankid error", err);
                                                            });
                                                        })
                                                        .then(() => {
                                                            console.log("accounts assignment length", transactions.length);
                                                            if (transactions.length) {
                                                                onCreateAssign(transactions[counter], bank_Type)
                                                                function onCreateAssign(trans, bankType) {
                                                                    console.log("oncreate calling..")
                                                                    if (trans) {
                                                                        const remainingAmount = trans.remainingAmount != undefined ? trans.remainingAmount : trans.amount;
                                                                        if (remainingAmount < 0 && bankType === "credit") {
                                                                            console.log("Credit income not able to assign..")
                                                                            counter++;
                                                                            if (counter != transactions.length && counter < transactions.length) {
                                                                                onCreateAssign(transactions[counter], bank_Type);
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
                                                                                                                console.log("plaid assign completed");
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
                                                                                                                                let sIndx = surplusBudgetTemplate.findIndex(o => o.paycheckId == params.paycheck.id);
                                                                                                                                if (sIndx != -1) {
                                                                                                                                    surplusBudgetTemplate[sIndx].amount = totalReceived - totalspentAmount + totalsurplusAmount;
                                                                                                                                }
                                                                                                                                else {
                                                                                                                                    surplusBudgetTemplate.push({
                                                                                                                                        paycheckId: params.paycheck.id,
                                                                                                                                        amount: totalReceived - totalspentAmount + totalsurplusAmount
                                                                                                                                    });
                                                                                                                                }
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
                                                                                                                                    console.log("surplus income..")
                                                                                                                                    updateGoal(remainAmount);
                                                                                                                                });
                                                                                                                            }
                                                                                                                            else {
                                                                                                                                console.log("not a single income found for most recent assignment..")
                                                                                                                                updateGoal(remainAmount);
                                                                                                                            }
                                                                                                                            function updateGoal(amount) {
                                                                                                                                console.log("goal checking processing..");

                                                                                                                                goalRef.where("goal_incomeSource_Id", "==", incomeSourceId).get().then((snap) => {
                                                                                                                                    if (snap.docs.length) {
                                                                                                                                        console.log("have a goal with this income id..");
                                                                                                                                        snap.docs.forEach((goal, indexA) => {
                                                                                                                                            if (goal.data().category_id === params.transaction.category_id) {
                                                                                                                                                goalRef.doc(goal.id).update({
                                                                                                                                                    left_amount: admin.firestore.FieldValue.increment(- Math.abs(amount)),
                                                                                                                                                    paid_amount: admin.firestore.FieldValue.increment(Math.abs(amount)),
                                                                                                                                                })
                                                                                                                                            }
                                                                                                                                            if (snap.docs.length - 1 === indexA) {
                                                                                                                                                counter++;
                                                                                                                                                if (counter != transactions.length && counter < transactions.length) {
                                                                                                                                                    onCreateAssign(transactions[counter], bank_Type);
                                                                                                                                                }
                                                                                                                                            }

                                                                                                                                        });
                                                                                                                                    }
                                                                                                                                    else {
                                                                                                                                        counter++;
                                                                                                                                        if (counter != transactions.length && counter < transactions.length) {
                                                                                                                                            onCreateAssign(transactions[counter], bank_Type);
                                                                                                                                        }
                                                                                                                                    }
                                                                                                                                });
                                                                                                                            }
                                                                                                                        }).catch((error) => {
                                                                                                                            counter++;
                                                                                                                            if (counter != transactions.length && counter < transactions.length) {
                                                                                                                                onCreateAssign(transactions[counter], bank_Type);
                                                                                                                            }
                                                                                                                        })

                                                                                                                    }).catch((error) => {
                                                                                                                        counter++;
                                                                                                                        if (counter != transactions.length && counter < transactions.length) {
                                                                                                                            onCreateAssign(transactions[counter], bank_Type);
                                                                                                                        }
                                                                                                                    })
                                                                                                                }
                                                                                                                //-----------------Expense---------------------
                                                                                                                else {
                                                                                                                    const incomeSourceId = params.paycheck.income_id;
                                                                                                                    let paycheckGet = incomeRef.doc(incomeSourceId).collection("paychecks").doc(params.paycheck.id);
                                                                                                                    var paycheckData = params.paycheck;
                                                                                                                    var existingBudgetDetails = paycheckData.budgetDetails;
                                                                                                                    console.log("adding transaction id to the budgets---------------------", addedTransactionId);
                                                                                                                    let index = existingBudgetDetails.findIndex(o => o.category === params.transaction.categoryName);
                                                                                                                    if (index != -1) {
                                                                                                                        console.log("adding transaction to the budgets---------------------", existingBudgetDetails[index]);
                                                                                                                        existingBudgetDetails[index].spent = existingBudgetDetails[index].spent + Math.abs(remainAmount);
                                                                                                                        existingBudgetDetails[index].available = existingBudgetDetails[index].available - Math.abs(remainAmount);
                                                                                                                        if (existingBudgetDetails[index].transactions && existingBudgetDetails[index].transactions.length) {
                                                                                                                            existingBudgetDetails[index].transactions.push(addedTransactionId);
                                                                                                                        }
                                                                                                                        else {
                                                                                                                            existingBudgetDetails[index].transactions = [addedTransactionId]
                                                                                                                        }
                                                                                                                        console.log("adding transaction to the budgets transactions array---------------------", existingBudgetDetails[index].transactions);
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
                                                                                                                        console.log("Expense type income updated..");
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
                                                                                                                                console.log("Expense a most recent income..");
                                                                                                                                let sIndx = recentPaycheck[0].surplusBudgetTemplate.findIndex(o => (o.paycheckId) == (params.paycheck.id));
                                                                                                                                if (sIndx != -1) {
                                                                                                                                    recentPaycheck[0].surplusBudgetTemplate[sIndx].amount = totalReceived - totalspentAmount + totalsurplusAmount;
                                                                                                                                }
                                                                                                                                else {
                                                                                                                                    recentPaycheck[0].surplusBudgetTemplate.push({
                                                                                                                                        paycheckId: params.paycheck.id,
                                                                                                                                        amount: totalReceived - totalspentAmount + totalsurplusAmount
                                                                                                                                    });
                                                                                                                                }
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
                                                                                                                                    console.log("Expense a most recent income updated..");
                                                                                                                                    updateGoals(remainAmount, params.transaction.category_id);

                                                                                                                                }).catch((e) => {
                                                                                                                                    counter++;
                                                                                                                                    if (counter != transactions.length && counter < transactions.length) {
                                                                                                                                        onCreateAssign(transactions[counter], bank_Type);
                                                                                                                                    }
                                                                                                                                });
                                                                                                                            }
                                                                                                                            else {
                                                                                                                                console.log("Expense not a single most recent income..");
                                                                                                                                updateGoals(remainAmount, params.transaction.category_id);
                                                                                                                            }
                                                                                                                            function updateGoals(amount, category_id) {
                                                                                                                                console.log('goals for this income processing..');
                                                                                                                                goalRef.where("goal_incomeSource_Id", "==", incomeSourceId).get().then((snap) => {
                                                                                                                                    if (snap.docs.length) {
                                                                                                                                        console.log('found a goal for expenses');
                                                                                                                                        snap.docs.forEach((goal, indexA) => {
                                                                                                                                            if (goal.data().category_id === category_id && goal.data().paid_amount > amount) {
                                                                                                                                                goalRef.doc(goal.id).update({
                                                                                                                                                    left_amount: admin.firestore.FieldValue.increment(Math.abs(amount)),
                                                                                                                                                    paid_amount: admin.firestore.FieldValue.increment(-Math.abs(amount)),
                                                                                                                                                });
                                                                                                                                            }
                                                                                                                                            if (snap.docs.length - 1 === indexA) {
                                                                                                                                                counter++;
                                                                                                                                                if (counter != transactions.length && counter < transactions.length) {
                                                                                                                                                    onCreateAssign(transactions[counter], bank_Type);
                                                                                                                                                }
                                                                                                                                            }
                                                                                                                                        });
                                                                                                                                    }
                                                                                                                                    else {
                                                                                                                                        counter++;
                                                                                                                                        if (counter != transactions.length && counter < transactions.length) {
                                                                                                                                            onCreateAssign(transactions[counter], bank_Type);
                                                                                                                                        }
                                                                                                                                    }
                                                                                                                                })

                                                                                                                            }
                                                                                                                        })
                                                                                                                            .catch((error) => {
                                                                                                                                counter++;
                                                                                                                                if (counter != transactions.length && counter < transactions.length) {
                                                                                                                                    onCreateAssign(transactions[counter], bank_Type);
                                                                                                                                }
                                                                                                                            });


                                                                                                                    }).catch((error) => {
                                                                                                                        counter++;
                                                                                                                        if (counter != transactions.length && counter < transactions.length) {
                                                                                                                            onCreateAssign(transactions[counter], bank_Type);
                                                                                                                        }
                                                                                                                    })
                                                                                                                }
                                                                                                            }
                                                                                                        }).catch(function (error) {
                                                                                                            counter++;
                                                                                                            if (counter != transactions.length && counter < transactions.length) {
                                                                                                                onCreateAssign(transactions[counter], bank_Type);
                                                                                                            }
                                                                                                        });
                                                                                                    }
                                                                                                    else {
                                                                                                        counter++;
                                                                                                        if (counter != transactions.length && counter < transactions.length) {
                                                                                                            onCreateAssign(transactions[counter], bank_Type);
                                                                                                        }
                                                                                                    }
                                                                                                }
                                                                                            });
                                                                                        }).catch(err => {
                                                                                            counter++;
                                                                                            if (counter != transactions.length && counter < transactions.length) {
                                                                                                onCreateAssign(transactions[counter], bank_Type);
                                                                                            }
                                                                                        })

                                                                                    })
                                                                                }
                                                                                else {
                                                                                    counter++;
                                                                                    if (counter != transactions.length && counter < transactions.length) {
                                                                                        onCreateAssign(transactions[counter], bank_Type);
                                                                                    }
                                                                                }
                                                                            }).catch(err => {
                                                                                counter++;
                                                                                if (counter != transactions.length && counter < transactions.length) {
                                                                                    onCreateAssign(transactions[counter], bank_Type);
                                                                                }

                                                                            })
                                                                        }
                                                                    }

                                                                }
                                                            }
                                                            else {
                                                                console.log("here is the reason of rejection", promises.length, transactions.length, bank.data().type != "credit")
                                                            }
                                                        }).catch(err => console.log(err));
                                                }
                                            });



                                        }
                                    });
                                }
                            })

                        }
                    }).catch(err => {
                        console.log(err)
                    })
                }
                await Promise.all(userpromises.map(async (item) => {
                    await runnallQueriesParallel(item)
                }))
                    .then((resuserIds) => {
                        console.log("all  user processing in One call??", resuserIds.length)
                    })
            }
        }).catch(err => {
            console.log("err", err)
        });
    }
    addIncomeSource(data) {
        return new Promise((resolve, reject) => {
            let payDate = [];
            var lastDate = new Date(data.payDate); // 11 nov
            var nextDate = new Date(new Date().setMonth(new Date().getMonth() + 1)); // 11 dec
            var dayDifferance = 0;
            var diff = new DateDiff(nextDate, lastDate);
            var numDays: any = parseInt(diff.days().toString());
            var numMonth: any = parseInt(diff.months().toString());
            var totalPaychecksReccured = 0;
            if (data.isRepeating && (data.repeatingType == 'monthly' ||
                data.repeatingType == 'semimonthly' || data.repeatingType == 'biweekly' ||
                data.repeatingType == 'weekly')) {
                if (data.repeatingType == 'weekly') {
                    dayDifferance = 7;
                    totalPaychecksReccured = parseInt((numDays / 7).toString());
                    if (numDays % 7 != 0) {
                        totalPaychecksReccured = totalPaychecksReccured + 1;
                    }
                    if (totalPaychecksReccured > 0) {
                        for (var i = 0; i < Math.ceil(totalPaychecksReccured); i++) {
                            payDate.push(new Date(new Date(data.payDate).setDate(new Date(data.payDate).getDate() + (7 * (i + 1)) - 7)));
                            if (payDate.length >= totalPaychecksReccured) {
                                resolve({ date: payDate, dayDifferance: dayDifferance });
                            }
                        }
                    }
                    else {
                        payDate.push(new Date(new Date(data.payDate).setDate(new Date(data.payDate).getDate())));
                        resolve({ date: payDate, dayDifferance: dayDifferance });
                    }
                }
                if (data.repeatingType == 'biweekly') {
                    dayDifferance = 14;
                    totalPaychecksReccured = parseInt((numDays / 14).toString());
                    if (numDays % 14 != 0) {
                        totalPaychecksReccured = totalPaychecksReccured + 1;
                    }
                    if (totalPaychecksReccured > 0) {
                        for (var i = 0; i < Math.ceil(totalPaychecksReccured); i++) {
                            payDate.push(new Date(new Date(data.payDate).setDate(new Date(data.payDate).getDate() + (14 * (i + 1)) - 14)));
                            if (payDate.length >= totalPaychecksReccured) {
                                resolve({ date: payDate, dayDifferance: dayDifferance });
                            }
                        }
                    }
                    else {
                        payDate.push(new Date(new Date(data.payDate).setDate(new Date(data.payDate).getDate() + (14 * 1) - 14)));
                        resolve({ date: payDate, dayDifferance: dayDifferance });
                    }
                }
                if (data.repeatingType == 'monthly') {
                    dayDifferance = 30;
                    totalPaychecksReccured = parseInt((numDays / 30).toString());
                    if (totalPaychecksReccured > 0) {
                        for (var i = 0; i <= totalPaychecksReccured; i++) {
                            if (data.weeks && data.weeks != null) {
                                let firstWeekOfDate = getDateofWeek(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate()), data.weeks.weekDays);
                                let weekNumber = data.weeks.weekNumber[0];
                                payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * weekNumber) - 7)));
                                if (payDate.length === totalPaychecksReccured) {
                                    resolve({ date: payDate, dayDifferance: dayDifferance });
                                }
                            } else {
                                let firstWeekOfDate = getDateofWeek(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate()), 0);
                                payDate.push(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate()));
                                if (payDate.length >= totalPaychecksReccured) {
                                    resolve({ date: payDate, dayDifferance: dayDifferance });
                                }
                            }
                        }
                    }
                    else {
                        let firstWeekOfDate = getDateofWeek(new Date(data.payDate), 0);
                        payDate.push(new Date(data.payDate));
                        resolve({ date: payDate, dayDifferance: dayDifferance });
                    }
                }
                if (data.repeatingType == 'semimonthly') {
                    dayDifferance = 15;
                    totalPaychecksReccured = parseInt((numDays / 15).toString());
                    if (totalPaychecksReccured > 0) {
                        for (var i = 0; i < Math.ceil(totalPaychecksReccured); i++) {
                            if (data.weeks.dateFormat === 'weekly') {
                                data.weeks.weekNumber.forEach(function (weeknum) {
                                    let firstWeekOfDate = getDateofWeek(new Date(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate())), data.weeks.weekDays);
                                    payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * weeknum) - 7)));
                                })
                                if (payDate.length >= totalPaychecksReccured) {
                                    resolve({ date: payDate, dayDifferance: dayDifferance });
                                }
                            }
                            else {
                                data.weeks.monthDays.forEach(function (dayNum) {
                                    var currentDate = new Date(new Date().setMonth(lastDate.getMonth() + i));
                                    payDate.push(new Date(currentDate.setDate(dayNum)));
                                })
                                if (payDate.length >= totalPaychecksReccured) {
                                    resolve({ date: payDate, dayDifferance: dayDifferance });
                                }
                            }
                        }
                    }
                    else {
                        if (data.weeks.dateFormat === 'weekly') {
                            data.weeks.weekNumber.forEach(function (weeknum) {
                                let firstWeekOfDate = getDateofWeek(new Date(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, lastDate.getDate())), data.weeks.weekDays);
                                payDate.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * weeknum) - 7)));
                            })
                            resolve({ date: payDate, dayDifferance: dayDifferance });
                        }
                        else {
                            data.weeks.monthDays.forEach(function (dayNum) {
                                var currentDate = new Date(new Date().setMonth(lastDate.getMonth() + i));
                                payDate.push(new Date(currentDate.setDate(dayNum)));
                            })
                            resolve({ date: payDate, dayDifferance: dayDifferance });
                        }
                    }
                }
            }
            else {
                payDate.push(new Date(data.payDate));
                if (payDate.length) {
                    resolve({ date: payDate, dayDifferance: dayDifferance });
                }
            }

            function getDateofWeek(startDate, days) {
                let date: any = moment().set('year', startDate.getFullYear()).set('month', startDate.getMonth()).set('date', 1);
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

    }
    editBudgetOfAllocatedCategory(params) {
        return new Promise((resolve, reject) => {
            var userId = admin.auth().currentUser.uid;
            const incomeRef = admin.firestore().collection("income_source").doc(userId).collection("incomes").doc(params.incomesourceId)
            incomeRef.get().then((incomeSnap) => {
                if (incomeSnap.exists) {
                    var dbData = incomeSnap.data();
                    var existingBudgetDetails = dbData.budgetTemplate.budgetTemplateDetails;
                    let index = existingBudgetDetails.findIndex(o => o.category === params.budgetline.category);
                    if (index != -1) {
                        existingBudgetDetails[index].budgeted = (existingBudgetDetails[index].budgeted - params.budgetline.budgeted) + params.amount;
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
                                            if (snapcountIndex === paycheckDocs.docs.length - 1) {
                                                editBudetAllocation(paycheckDocsData[count]);
                                                function editBudetAllocation(o) {
                                                    count++;
                                                    if (o.payDateTimeStamp >= request.payDateTimeStamp) {
                                                        let paycheckDetails = o;
                                                        let existingBudget = paycheckDetails.budgetDetails;
                                                        let pIndex = existingBudget.findIndex(m => m.category === request.budgetline.category);
                                                        if (pIndex != -1) {
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
                                                                        if (mIndex != -1) {
                                                                            mostrecent[0].budgetDetails[mIndex].budgeted = (mostrecent[0].budgetDetails[mIndex].budgeted - request.budgetline.budgeted) + request.amount;
                                                                            mostrecent[0].budgetDetails[mIndex].available = (mostrecent[0].budgetDetails[mIndex].available - request.budgetline.budgeted) + request.amount;
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
                                                                            if (count === paycheckDocs.docs.length) {
                                                                                resolve({
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
                                                                                    paycheckDocsData[find].budgetsAvailable = mtotalReceived - mtotalspentAmount + mtotalsurplusAmount;
                                                                                    paycheckDocsData[find].isOverbudget = (mtotalReceived - mtotalbudgetedAmount + mtotalsurplusAmount) < 0 ? true : false;
                                                                                    paycheckDocsData[find].isOverspent = (mtotalReceived - mtotalspentAmount + mtotalsurplusAmount) < 0 ? true : false;
                                                                                }
                                                                                editBudetAllocation(paycheckDocsData[count])
                                                                            }
                                                                        }).catch(() => {
                                                                            if (count === paycheckDocs.docs.length) {
                                                                                resolve({
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
                                                                            resolve({
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
                                                            console.log(err)
                                                        })
                                                    }
                                                    else {
                                                        if (count === paycheckDocs.docs.length) {
                                                            resolve({
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
                                        });

                                    }
                                    else {
                                        resolve({ success: false, message: 'No paycheck found for this income source' })
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

                                                            resolve({
                                                                success: true,
                                                                message: "update all paychecks"
                                                            })

                                                        }).catch(() => {
                                                            resolve({
                                                                success: true,
                                                                message: "update all paychecks"
                                                            })

                                                        })
                                                    }
                                                    else {
                                                        resolve({
                                                            success: true,
                                                            message: "update all paychecks"
                                                        })
                                                    }
                                                }
                                            })
                                        }).catch((err) => {
                                            console.log(err)
                                        })
                                    }
                                })
                            }
                        }
                    }).catch((err) => {
                        console.log(err);
                        reject();
                    })
                }
            }).catch((err) => {
                console.log(err);
                reject();
            })
        })
    }
    getsurplus(params) {
        return new Promise((resolve, reject) => {
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
                                                resolve({
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
                                                resolve({
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
                                    resolve({
                                        success: false,
                                        message: "Surplus not got due to date not matched"
                                    })
                                }
                            }
                        });

                    }
                    else {
                        resolve({
                            success: false,
                            message: "No Paychecks Found for the current income source"
                        })
                    }
                }).catch((err) => {
                    console.log("error while getting income source paychecks", err);
                    reject();
                })
            }
            else {
                reject()
            }

        })
    }
    getFailedPlaidConnection() {
        return new Promise((resolve, reject) => {
            admin.firestore().collection('users').doc(admin.auth().currentUser.uid).collection('failedToken').get().then((tokenSnap) => {
                if (tokenSnap.docs.length) {
                    resolve([Object.assign({ id: tokenSnap.docs[0].id }, { auth_tokens: tokenSnap.docs[0].data().auth_tokens })])
                }
                else {
                    resolve([]);
                }
            }).catch(err => {
                console.log(err);
                reject();
            })
        })

    }
    setToken(userId, invalid_token, refreshToken) {
        return new Promise((resolve, reject) => {
            const bankRef = admin.firestore().collection('accounts').doc(userId).collection('bank_account');
            const tokenRef = admin.firestore().collection('users').doc(userId).collection('failedToken');
            bankRef.get().then((tokenSnap) => {
                if (tokenSnap.docs.length) {
                    var count = 0;
                    tokenSnap.docs.forEach(account => {
                        count++;
                        console.log(account.data().accounts_tokens);
                        console.log(invalid_token.access_token);
                        if (account.data().accounts_tokens === invalid_token.access_token) {
                            console.log('matched token');
                            bankRef.doc(account.id).update({
                                accounts_tokens: refreshToken
                            });
                        }
                        if (count === tokenSnap.docs.length) {
                            tokenRef.get().then((tokenSnap) => {
                                if (tokenSnap.docs.length) {
                                    var id = tokenSnap.docs[0].id;
                                    var auth_tokens = tokenSnap.docs[0].data().auth_tokens;
                                    let authIndex = auth_tokens.findIndex(o => o.access_token === invalid_token.access_token)
                                    if (authIndex != -1) {
                                        auth_tokens.splice(authIndex, 1)
                                    }
                                    tokenRef.doc(id).update({
                                        auth_tokens: auth_tokens
                                    });
                                    resolve([])
                                }
                            })
                        }
                    });
                }
                else {
                    tokenRef.get().then((tokenSnap) => {
                        if (tokenSnap.docs.length) {
                            var id = tokenSnap.docs[0].id;
                            var auth_tokens = tokenSnap.docs[0].data().auth_tokens;
                            let authIndex = auth_tokens.findIndex(o => o.access_token === invalid_token.access_token)
                            if (authIndex != -1) {
                                auth_tokens.splice(authIndex, 1)
                            }
                            tokenRef.doc(id).update({
                                auth_tokens: auth_tokens
                            });
                            resolve([])
                        }
                    })
                }
            }).catch(err => {
                console.log(err);
                reject();
            })
        })

    }
    presentLoading() {
        let loader = this.loadCtrl.create({
            message: 'Loading',
            spinner: "dots",
            duration: 1500
        });
        loader.then(prompt => {
            prompt.present();
        });
    }
    dailyRUn() {
        var userpromises = [];
        userpromises.push({ id: 'Z8eCiLx0iCZzIXYpwBLSBqtQ9DE3' });
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
                                            var c: any = numDays / 7;
                                            for (var i = 0; i < parseInt(c); i++) {
                                                payDate.push(new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + (7 * (i + 1))));
                                            }
                                            totalPaychecksReccured = payDate.length;
                                        }
                                        else if (mode == "monthly") {
                                            var c: any = numMonth;
                                            for (var i = 0; i < parseInt(c); i++) {
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
                                            var c: any = numDays / 14;
                                            for (var i = 0; i < parseInt(c); i++) {
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
                                                            if (!paychecksArray.some(el => el.payDateTimeStamp >= new Date(payDate[key]).getTime())) {
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
                                                                    "budgetDetails": template
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
                                                                key++;
                                                                if (key < payDate.length) {
                                                                    addPayChecks(key);
                                                                }
                                                                else {

                                                                    addExtraIncome(payDate)
                                                                }
                                                            }
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
                                                                "budgetDetails": template
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
                                                            var c: any = numDays / 7;
                                                            for (var i = 0; i < parseInt(c); i++) {
                                                                addpayDate.push(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth(), lastAssigned.getDate() + (7 * (i + 1))));
                                                            }
                                                            totalPaychecksReccured = addpayDate.length;
                                                        }
                                                        else if (mode1 == "monthly") {
                                                            var c: any = numMonth;
                                                            for (var i = 0; i < parseInt(c); i++) {
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
                                                            var c: any = numDays / 14;
                                                            for (var i = 0; i < parseInt(c); i++) {
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
                                                            var c: any = numDays / 7;
                                                            for (var i = 0; i < parseInt(c); i++) {
                                                                addpayDate.push(new Date(lastAssigned.getFullYear(), lastAssigned.getMonth(), lastAssigned.getDate() + (7 * (i + 1))));
                                                            }
                                                            totalPaychecksReccured = addpayDate.length;
                                                        }
                                                        else if (mode1 == "monthly") {
                                                            var c: any = numMonth;
                                                            for (var i = 0; i < parseInt(c); i++) {
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
                                                            var c: any = numDays / 14;
                                                            for (var i = 0; i < parseInt(c); i++) {
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
                                            let date: any = moment().set('year', startDate.getFullYear()).set('month', startDate.getMonth()).set('date', 1);
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
    }
    addtoExistingIncomeSources(req) {
        const params = req.params;
        const slectedIncome = req.slectedIncome;
        const data = req.data;
        return new Promise((resolve, reject) => {
            addIncomeSource(params).then((datesRes: any) => {
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
                                                    console.log(JSON.stringify(dataEle));
                                                    incomeRef.collection('paychecks').doc(dataEle.id).update({
                                                        budgetsAvailable: dataEle.budgetsAvailable,
                                                        totalExpected: dataEle.totalExpected,
                                                        budgetsToBeBudgeted: dataEle.budgetsToBeBudgeted,
                                                        add_incomes: dataEle.add_income
                                                    }).then(() => {
                                                        console.log("updated paycheck date : ", dataEle.payDate);
                                                        paycheckDates.push(dataEle.payDate);
                                                        function updateMostrecent() {
                                                            //  resolve section

                                                            console.log({
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
                                                                console.log(" most recent paycheck date : ", Mostrecent.length);
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
                                                            console.log({
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
                                                    console.log({
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
                                        console.log({
                                            succes: false,
                                            message: "assigned income length is zero"
                                        })

                                    }
                                }).catch((err) => {
                                    console.log("paycheck", err)
                                    console.log({
                                        succes: false,
                                        message: "Error While getting paychecks :("
                                    })
                                });

                            }).catch((err) => {
                                console.log("income", err)
                                console.log({
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
                    console.log({
                        success: false,
                        message: "No Dates For the given income"
                    })
                }
            }).catch((error) => {
                console.log("error while generating the dates", error)
                console.log({
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
                let date: any = moment().set('year', startDate.getFullYear()).set('month', startDate.getMonth()).set('date', 1);
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
        })

    }
    generateNewPaycheck() {
        const usersRef = admin.firestore().collection("income_source");
        // usersRef.get().then(async (snapUsers) => {
        var userslist = [];
        // snapUsers.docs.forEach((o, uIndex) => {
        // getting all users
        usersRef.doc('Z8eCiLx0iCZzIXYpwBLSBqtQ9DE3').collection("incomes").get().then(async (snapIncome) => {
            var incomesArray = [];
            if (snapIncome.docs.length) {
                snapIncome.docs.map(async oi => incomesArray.push(Object.assign({ id: oi.id }, { payDate: await getPayDate(oi.data()) }, oi.data())));
            }
            userslist.push({ uid: 'Z8eCiLx0iCZzIXYpwBLSBqtQ9DE3', incomes: incomesArray });
            // if (uIndex === (snapUsers.docs.length - 1)) {
            Promise.all(userslist).then((allusers) => {
                const totalUsers = allusers.length;
                allusers.forEach((user) => {
                    if (user.incomes.length) {
                        user.incomes.forEach(_newPay => {
                            const incomeRef = usersRef.doc(user.uid).collection("incomes").doc(_newPay.id);
                            var template = [];
                            if (_newPay.budgetTemplate.budgetTemplateDetails.length) {
                                _newPay.budgetTemplate.budgetTemplateDetails.forEach(function (i) {
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
                            var totalBudgetAmount = template.map(o => o.budgeted).reduce(function (a, b) {
                                return a + b;
                            }, 0);
                            var totaltmplspentAmount = template.map(o => o.spent).reduce(function (a, b) {
                                return a + b;
                            }, 0);
                            if (_newPay.payDate && _newPay.payDate.length) {
                                for (let index = 0; index < _newPay.payDate.length; index++) {
                                    const element = _newPay.payDate[index];
                                    incomeRef.collection("paychecks").add({
                                        "name": `${new Date(element).toLocaleDateString()} Paycheck`,
                                        "payDate": new Date(element),
                                        "payDateTimeStamp": new Date(element).getTime(),
                                        "totalExpected": _newPay.budgetTemplate.totalExpected,
                                        "totalReceived": 0,
                                        'add_incomes': [],
                                        "surplusBudgetTemplate": [],
                                        "receivedPaycheckTransaction": [],
                                        "budgetsAvailable": (_newPay.budgetTemplate.totalExpected - totaltmplspentAmount),
                                        "budgetsCurrent": totalBudgetAmount,
                                        "budgetsToBeBudgeted": (_newPay.budgetTemplate.totalExpected - totalBudgetAmount),
                                        "isOverbudget": (_newPay.budgetTemplate.totalExpected - totalBudgetAmount) < 0 ? true : false,
                                        "isOverspent": (_newPay.budgetTemplate.totalExpected - totaltmplspentAmount) < 0 ? true : false,
                                        "budgetDetails": template
                                    }).then((addSnap) => {
                                        _newPay.repeating.payDays.push(admin.firestore.Timestamp.fromDate(element));
                                        _newPay.paycheckIds.push(addSnap.id);
                                        incomeRef.update({
                                            paycheckIds: _newPay.paycheckIds,
                                            repeating: _newPay.repeating,
                                        }).then(() => {
                                            console.log("income paycheck is added for user:", user.uid)
                                        })
                                    }).catch(err => {
                                        console.log(err);
                                    })

                                }
                            }

                        });

                    }
                })
            })
            // }
        }).catch((err) => {
            console.log(err)
        })
        // });

        // }).catch((err) => {
        //     console.log(err);
        // })


        // function for payDates
        function getPayDate(incomeCheck) {
            var today = new Date();
            var recurrTillDate = today.setMonth(today.getMonth() + 1);
            let repeatingDates = [];
            let payDays = [];
            if (incomeCheck.repeating && incomeCheck.repeating.payDays && incomeCheck.repeating.payDays.length) {
                incomeCheck.repeating.payDays.filter(o => repeatingDates.push(o.toDate()))
                var lastDate;
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
                var mode = incomeCheck.repeating.type;
                switch (mode) {
                    case "weekly":
                        var c = numDays / 7;
                        for (var i = 0; i < Math.floor(c); i++) {
                            payDays.push(new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + (7 * (i + 1))));
                        }
                        return payDays;
                    case "monthly":
                        for (var i = 0; i < Math.floor(numMonth); i++) {
                            if (incomeCheck.weeks && incomeCheck.weeks != null) {
                                var firstWeekOfDate = getDateofWeek(new Date(lastDate.getFullYear(), lastDate.getMonth() + i + 1, lastDate.getDate()), incomeCheck.weeks.weekDays);
                                payDays.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * incomeCheck.weeks.weekNumber[0]) - 7)));
                            } else {
                                payDays.push(new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, lastDate.getDate() + (7 * i)));

                            }
                        }
                        return payDays;
                    case "semimonthly":
                        for (var i = 0; i < Math.ceil(numMonth); i++) {
                            if (incomeCheck.weeks.dateFormat === 'weekly') {
                                var firstWeekOfDate = getDateofWeek(new Date(lastDate.getFullYear(), lastDate.getMonth() + i + 1, lastDate.getDate()), incomeCheck.weeks.weekDays);
                                payDays.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * incomeCheck.weeks.weekNumber[0]) - 7)));
                                payDays.push(new Date(firstWeekOfDate.setDate(firstWeekOfDate.getDate() + (7 * incomeCheck.weeks.weekNumber[1]) - 7)));
                            }
                            else if (incomeCheck.weeks.dateFormat === 'Date') {
                                var currentDate = new Date(new Date(new Date(new Date().setFullYear(lastDate.getFullYear())).setMonth(lastDate.getMonth() + i + 1)).setDate(lastDate.getDate()));
                                payDays.push(new Date(currentDate.setDate(incomeCheck.weeks.monthDays[0])));
                                payDays.push(new Date(currentDate.setDate(incomeCheck.weeks.monthDays[1])));
                            }
                        }
                        return payDays;
                    case "biweekly":
                        var c = numDays / 14;
                        for (var i = 0; i < Math.floor(c); i++) {
                            payDays.push(new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + (14 * (i + 1))));
                        }
                        return payDays;

                    default:
                        return payDays;
                }
            }


        }
        function getDateofWeek(startDate, days) {
            let date: any = moment().set('year', startDate.getFullYear()).set('month', startDate.getMonth()).set('date', 1);
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

    // this is for dailyBudget check function and it for testing only??
    dailyBudgetCheck() {
        var userpromises = [];
        // if (snapUsers.docs.length) {
        //     snapUsers.docs.map(async (o) => 
        userpromises.push({ id: 'Z8eCiLx0iCZzIXYpwBLSBqtQ9DE3' });
        // );

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
                                let index = payDates.findIndex(o => o === new Date('02/17/2022').toLocaleDateString())
                                if (index != -1) {
                                    callback(incomeObj.id);
                                    function callback(incomeId) {
                                        admin.firestore().collection("income_source").doc(user_Id).collection("incomes").doc(incomeId).collection('paychecks').get().then((snapPaycheck) => {
                                            var mostRecentPaycheck = [], filterCurrent;
                                            snapPaycheck.docs.filter(e => {
                                                if (new Date(e.data().payDateTimeStamp).toLocaleDateString() === new Date('02/17/2022').toLocaleDateString()) {
                                                    return filterCurrent = Object.assign({ id: e.id }, e.data())
                                                }
                                            });
                                            snapPaycheck.docs.forEach((element, paycheckIndex) => {
                                                if (element.data().payDateTimeStamp <= new Date().getTime() && new Date(element.data().payDateTimeStamp).toLocaleDateString() != new Date('02/17/2022').toLocaleDateString()) {
                                                    mostRecentPaycheck.push(Object.assign({ id: element.id }, element.data()));
                                                    mostRecentPaycheck = mostRecentPaycheck.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp);
                                                    if (mostRecentPaycheck.length && paycheckIndex === (snapPaycheck.docs.length - 1)) {
                                                        mostRecentPaycheck[0].budgetDetails.forEach((budget, bIndex) => {
                                                            // find if budgetline itme is already in current paycheck
                                                            debugger;
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
                                                                })
                                                                if (paycheckIndex === (snapPaycheck.docs.length - 1)) {
                                                                    if (totalIncomesource > incomeCount) {
                                                                        getIncomeSource(incomePromises[incomeCount])
                                                                    }
                                                                    else {
                                                                        if (usrCount < totalUserActive) {
                                                                            getUsersIncomeSources(userpromises[usrCount].id)
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        });
                                                    }
                                                }
                                                else {
                                                    if (mostRecentPaycheck.length && paycheckIndex === (snapPaycheck.docs.length - 1)) {
                                                        mostRecentPaycheck[0].budgetDetails.forEach((budget, bIndex) => {
                                                            // find if budgetline itme is already in current paycheck
                                                            debugger;
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
                                                                })
                                                                if (paycheckIndex === (snapPaycheck.docs.length - 1)) {
                                                                    if (totalIncomesource > incomeCount) {
                                                                        getIncomeSource(incomePromises[incomeCount])
                                                                    }
                                                                    else {
                                                                        if (usrCount < totalUserActive) {
                                                                            getUsersIncomeSources(userpromises[usrCount].id)
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        });
                                                    }
                                                    else if (paycheckIndex === (snapPaycheck.docs.length - 1)) {
                                                        if (totalIncomesource > incomeCount) {
                                                            getIncomeSource(incomePromises[incomeCount])
                                                        }
                                                        else {
                                                            if (usrCount < totalUserActive) {
                                                                getUsersIncomeSources(userpromises[usrCount].id)
                                                            }
                                                        }
                                                    }
                                                }
                                            });
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
                                        }
                                    }
                                }
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

}