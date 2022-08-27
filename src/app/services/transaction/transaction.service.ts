import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { cloud_api, api_token, stripe_publisher_key } from 'src/config/config';
import * as firebase from 'firebase';
import { ApiService } from '../api/api.service';
import { Storage } from '@ionic/storage';
import { Events } from '../Events.service';
import DateDiff from "../firebase-api-local/date-diff";
@Injectable({
  providedIn: "root"
})
export class TransactionService {
  public paycheckDetails;
  public transactionDetails;
  public budgetdetails;
  dateRange = {
    displayForm: "",
    displayTo: "",
  };
  constructor(
    private httpClient: HttpClient,
    public api: ApiService,
    public events: Events,
    private storage: Storage
  ) { }
  // -----------------------------------set global variables--------------------------------------------
  // paycheck details parameters
  setPaycheckDetails(item) {
    this.paycheckDetails = item;
  }
  getPaycheckDetails() {
    return this.paycheckDetails;
  }
  // transaction parameters 
  settransactionDetails(item) {
    this.transactionDetails = item;
  }
  gettransactionDetails() {
    return this.transactionDetails;
  }

  // budget allocation parameters 
  setBudgetDetails(item) {
    this.budgetdetails = item;
  }
  getBudgetDetails() {
    return this.budgetdetails;
  }

  // -----------------------------------other global functions--------------------------------------------


  deleteAccount(account_id) {
    return new Promise<any>((resolve, reject) => {
      const query = firebase.firestore().collection('accounts').doc(firebase.auth().currentUser.uid).collection('account').doc(account_id);
      query.delete().then(() => {
        resolve({})
      }).catch((error: any) => {
        reject(error)
      });
    });
  }

  exchangeToken(token) {
    return this.httpClient
      .post(
        cloud_api + "exchangeToken",
        {
          public_token: token,
        }
      )
      .toPromise();
  }
  saveAccounts(acc, token) {
    return new Promise<any>((resolve, reject) => {
      acc.forEach(account => {
        account.lastFour = account.account_id.substr(account.account_id.length - 4);
        account.hasPermission = true;
      });
      const headers = new HttpHeaders({
        "Content-Type": "application/json",
      })
      this.httpClient
        .post(`${cloud_api}addAccount`, {
          "accounts": acc,
          "uid": firebase.auth().currentUser.uid,
          "token": token
        }, {
          headers
        })
        .subscribe((res: any) => {
          if (res) {
            resolve(res);
          }
        }, err => {
          reject();
        });
    })
  }
  updateAccount(account_id, boolean) {
    let refDoc = firebase.firestore().collection('accounts').doc(firebase.auth().currentUser.uid).collection('bank_account');
    refDoc.doc(account_id).update({ hasPermission: boolean });
  }
  getAccounts(token) {
    return this.httpClient
      .post(
        cloud_api + "getAccountsfromPlaid",
        {
          access_token: token,
          uid: firebase.auth().currentUser.uid
        }
      )
      .toPromise();
  }
  reAuthbyToken(data) {
    let params = Object.assign({ uid: firebase.auth().currentUser.uid }, data)
    return this.httpClient
      .post(
        cloud_api + "createFuturePaychecks",
        params
      )
      .toPromise();
  }
  retriveTransaction(accessToken, date) {
    return this.httpClient
      .post(
        cloud_api + "retrieveTransactions",
        {
          access_token: accessToken,
          start_date: date.displayForm,
          end_date: date.displayTo
        }
      )
      .toPromise();
  }
  saveTransaction(accessToken, accountId, type, date) {
    return this.httpClient
      .post(
        cloud_api + "savePlaidTransactions",
        {
          access_token: accessToken,
          account_id: accountId,
          banktype: type,
          start_date: date.displayForm,
          end_date: date.displayTo,
          userId: firebase.auth().currentUser.uid
        }
      )
      .toPromise();
  }
  getItems(accessToken) {
    return this.httpClient
      .post(
        cloud_api + "retrieveItems",
        {
          access_token: accessToken
        }
      )
      .toPromise();
  }
  deleteAccountLocal(data) {
    var me = this;
    return new Promise<any>((resolve, reject) => {
      const body = data
      if (body.removeallDetail) {
        const deletacc = firebase.firestore().collection('accounts').doc(firebase.auth().currentUser.uid).collection('bank_account').doc(body.account_id);
        const query = firebase.firestore().collection('user_plaid_transaction').doc(firebase.auth().currentUser.uid).collection('transactions').where("account_id", "==", body.account_id);
        const plaidquery = firebase.firestore().collection('user_plaid_transaction').doc(firebase.auth().currentUser.uid).collection('transactions')
        query.get().then(function (snap) {
          if (snap.docs.length === 0) {
            deletacc.delete();
            resolve({
              success: true,
              message: "No Plaid transactions exists"
            });
          }
          else {
            const plaidpromise = [];
            var count = 0;
            snap.docs.forEach(function (plaid) {
              plaidpromise.push({ id: plaid.id })
            });
            Promise.all(plaidpromise)
              .then(function (result) {
                if (result.length == 0) {
                  deletacc.delete();
                  resolve({
                    success: true,
                    message: "No Plaid transactions exists"
                  });
                }
                result.forEach(function (outer) {
                  count++;
                  var counttrans = 0;
                  const ref = firebase.firestore().collection('user_transaction').doc(firebase.auth().currentUser.uid).collection('transactions').where("plaidTransId", "==", outer.id);
                  ref.get().then(function (snapshot) {
                    if (snapshot.docs.length === 0) {
                      deletacc.delete();
                      plaidquery.doc(outer.id).delete();
                      resolve({
                        success: true,
                        message: "No transactions exists"
                      });
                    } else {
                      const transPromise = [];
                      snapshot.docs.forEach(function (trans) {
                        transPromise.push({ id: trans.id })
                      })
                      Promise.all(transPromise)
                        .then(function (transCount) {
                          counttrans++;
                          if (transCount.length == 0) {
                            deletacc.delete();
                            plaidquery.doc(outer.id).delete();
                            resolve({
                              success: true,
                              message: "No transactions exists"
                            });
                          }
                          transCount.forEach(function (inner) {
                            let headers = {
                              "Content-Type": "application/json",
                            };
                            me.api.unAssignTransaction(inner.id);
                          })
                          if (counttrans === transCount.length) {
                            deletacc.delete();
                            plaidquery.doc(outer.id).delete();

                            resolve({
                              success: true,
                              message: "Plaid transactions Deleted"
                            });
                          }

                        });
                    }
                  }).catch(function (error) {
                    resolve({
                      success: false,
                      error: error
                    });
                  });
                })
                if (count === result.length) {
                  deletacc.delete();
                  resolve({
                    success: true,
                    message: "Plaid transactions Deleted"
                  });
                }
              })
          }
        })
          .catch(function (error) {
            resolve({
              success: false,
              error: error
            });
          });
      }
      else {
        const query = firebase.firestore().collection('accounts').doc(firebase.auth().currentUser.uid).collection('bank_account').doc(body.account_id);
        query.delete();
        resolve({
          success: true,
          res: "delete successfully"
        });
      }
    })
  }
  deleteGoals(goal) {
    var that = this;
    return new Promise((resolve, reject) => {
      let userRef = firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).collection('goals').doc(goal.id);
      let incomeRef = firebase.firestore().collection('income_source').doc(firebase.auth().currentUser.uid).collection('incomes').doc(goal.goal_incomeSource_Id);
      incomeRef.get().then(snap => {
        var dbData = snap.data();
        var existingBudgetDetails = [];
        existingBudgetDetails = dbData.budgetTemplate.budgetTemplateDetails;
        existingBudgetDetails.forEach(function (i, index) {
          var ind = i.goalId.findIndex(o => o == goal.id);
          if (ind != -1) {
            existingBudgetDetails[index].goalId.splice(ind, 1);
          }
          if (i.category == goal.goal_category) {
            existingBudgetDetails[index].budgeted = i.budgeted - goal.goal_monthly_amount;
          }
        })
        dbData.budgetTemplate.budgetTemplateDetails = existingBudgetDetails;
        var ind = dbData.goals.findIndex(o => o == goal.id);
        if (ind != -1) {
          dbData.goals.splice(ind, 1);
        }
        incomeRef.update({
          'budgetTemplate.budgetTemplateDetails': existingBudgetDetails,
          'goals': dbData.goals
        }).then(ot => {
          userRef.delete();
          var counter = 0;
          incomeRef.collection('paychecks').get().then(function (paycheck) {

            if (paycheck.docs.length == 0) {
              resolve({ success: true })
            }
            paycheck.forEach(function (paycheckObj) {
              counter++;
              var paycheckData = paycheckObj.data();
              paycheckData.budgetDetails.forEach(function (budgetDetails, index) {
                if (budgetDetails.category === goal.goal_category) {
                  paycheckData.budgetDetails[index].budgeted = budgetDetails.budgeted - goal.goal_monthly_amount;
                  paycheckData.budgetDetails[index].available = budgetDetails.available - goal.goal_monthly_amount;
                }
              })
              incomeRef.collection('paychecks').doc(paycheckObj.id).update({
                budgetDetails: paycheckData.budgetDetails,
                budgetsToBeBudgeted: paycheckData.budgetsToBeBudgeted + (goal.goal_type == "debt-Reduction" ? goal.goal_target_amount : goal.goal_monthly_amount),
                budgetsAvailable: paycheckData.budgetsAvailable + (goal.goal_type == "debt-Reduction" ? goal.goal_target_amount : goal.goal_monthly_amount),
                budgetsCurrent: paycheckData.budgetsCurrent - (goal.goal_type == "debt-Reduction" ? goal.goal_target_amount : goal.goal_monthly_amount),
                isOverbudget: (paycheckData.budgetsToBeBudgeted - (goal.goal_type == "debt-Reduction" ? goal.goal_target_amount : goal.goal_monthly_amount)) < 0 ? true : false,
                isOverspent: (paycheckData.budgetsAvailable - (goal.goal_type == "debt-Reduction" ? goal.goal_target_amount : goal.goal_monthly_amount)) < 0 ? true : false
              });
            })
            if (paycheck.docs.length == counter) {
              resolve({ success: true })
            }
          }).catch(function () {
            reject();
          })
        }).catch(function () {
          reject();
        });

      }).catch(function () {
        reject();
      })
    })
  }
  updateCategory(data, newCat) {
    var me = this;
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
        var totalDays = Math.floor((30 / 100) * (((totalTime - typeRecurresion)) * 100));
        var date = new Date().setDate(new Date().getDate() + (totalDays + (typeRecurresion * type)));
        return new Date(date);
      }
    }
    function getAchiveDebtDateFormula(payPermonth, totalAmount, type) {
      if (payPermonth && totalAmount) {
        let totalTime = totalAmount / payPermonth;
        let typeRecurresion = Math.floor(totalTime);
        var totalDays = Math.floor((30 / 100) * (((totalTime - typeRecurresion)) * 100));
        var date = new Date().setDate(new Date().getDate() + (totalDays + (typeRecurresion * type)));
        return new Date(date);
      }
    }
    return new Promise<any>((resolve, reject) => {
      var incomeref = firebase.firestore().collection('income_source').doc(firebase.auth().currentUser.uid).collection('incomes');
      var userTransactions = firebase.firestore().collection('user_transaction').doc(firebase.auth().currentUser.uid).collection('transactions');
      var plaid_transactions = firebase.firestore().collection('user_plaid_transaction').doc(firebase.auth().currentUser.uid).collection('transactions');
      const goalRef = firebase.firestore().collection("users").doc(firebase.auth().currentUser.uid).collection("goals");
      if (data.paycheck && data.paycheck.length) {
        data.paycheck.forEach((paycheckEle, index) => {
          var payCheckRef = incomeref.doc(paycheckEle.incomeid).collection('paychecks').doc(paycheckEle.id);
          payCheckRef.get().then(snap => {
            if (snap.exists) {
              var amount = data.assignment.map(o => o.amount).reduce(function (a, b) {
                return a + b;
              }, 0);
              var paycheckRec = snap.data();
              if (data.type === "income") {
                updateTransactionCategory(data, newCat);
              }
              else {
                var existingBudgetDetails = paycheckRec.budgetDetails;
                let index1 = existingBudgetDetails.findIndex(o => o.category === data.category);
                let index2 = existingBudgetDetails.findIndex(o => o.category === newCat.category);

                if (index1 != -1) {
                  existingBudgetDetails[index1].spent = existingBudgetDetails[index1].spent - amount;
                  existingBudgetDetails[index1].available = existingBudgetDetails[index1].available + amount;
                  existingBudgetDetails[index1].transactions = existingBudgetDetails[index1].transactions.filter(o => o != data.id)
                }
                if (index2 != -1) {
                  existingBudgetDetails[index2].spent = existingBudgetDetails[index2].spent + amount;
                  existingBudgetDetails[index2].available = existingBudgetDetails[index2].available - amount;
                  if (existingBudgetDetails[index2].transactions && existingBudgetDetails[index2].transactions.length) {
                    existingBudgetDetails[index2].transactions.push(data.id);
                  }
                  else {
                    existingBudgetDetails[index2].transactions = [data.id]
                  }
                }
                else {
                  existingBudgetDetails.push({
                    "category": newCat.category,
                    "category_id": newCat.category_id,
                    "budgeted": 0,
                    "spent": amount,
                    "available": -amount,
                    "transactions": [data.id]
                  })
                }
                goalRef.where("goal_incomeSource_Id", "==", paycheckEle.incomeid).get().then((snap) => {
                  if (snap.docs.length) {
                    snap.docs.forEach(goal => {
                      let goalData = goal.data();
                      if (goalData.category_id === data.category_id) {
                        if (goalData.goal_type === "saving") {
                          goalData.left_amount = goalData.left_amount + Math.abs(amount);
                          goalData.paid_amount = goalData.paid_amount - Math.abs(amount);
                          if (goalData.paid_amount >= goalData.goal_amount) {
                            goalData.left_amount = 0;
                          }
                          goalData.isAccomplished = (goalData.left_amount >= goalData.goal_amount) ? true : false;
                          calculateDate(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                            goalData.goal_endDate = date;
                          });
                        }
                        else {
                          goalData.left_amount = goalData.left_amount + Math.abs(amount);
                          goalData.paid_amount = goalData.paid_amount - Math.abs(amount);
                          if (goalData.paid_amount >= goalData.goal_amount) {
                            goalData.left_amount = 0;
                          }
                          goalData.isAccomplished = (goalData.left_amount === 0) ? true : false;
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
                      else if (goalData.category_id === newCat.category_id) {
                        if (goalData.goal_type === "saving") {
                          goalData.left_amount = goalData.left_amount - Math.abs(amount);
                          goalData.paid_amount = goalData.paid_amount + Math.abs(amount);
                          if (goalData.paid_amount >= goalData.goal_amount) {
                            goalData.left_amount = 0;
                          }
                          goalData.isAccomplished = (goalData.paid_amount >= goalData.goal_amount) ? true : false;
                          calculateDate(goalData.goal_monthly_amount, goalData.left_amount, { isRepeating: goalData.isRepeating, repeating: goalData.repeating }).then((date) => {
                            goalData.goal_endDate = date;
                          });
                        }
                        else {
                          goalData.left_amount = goalData.left_amount - Math.abs(amount);
                          goalData.paid_amount = goalData.paid_amount + Math.abs(amount);
                          if (goalData.paid_amount >= goalData.goal_amount) {
                            goalData.left_amount = 0;
                          }
                          goalData.isAccomplished = (goalData.paid_amount === 0) ? true : false;
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
                var totalReceived = paycheckRec.totalReceived === 0 ? paycheckRec.totalExpected : paycheckRec.totalReceived;
                var totalspentAmount = existingBudgetDetails.map(o => o.spent).reduce(function (a, b) {
                  return a + b;
                }, 0);
                var totalsurplusAmount = paycheckRec.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                  return a + b;
                }, 0);
                payCheckRef.update({ budgetDetails: existingBudgetDetails });
                incomeref.doc(paycheckEle.incomeid).collection("paychecks").get().then((paychecksDocs) => {
                  var Mostrecent = [];
                  paychecksDocs.docs.filter(o => {
                    if (o.data().payDateTimeStamp > paycheckRec.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                      Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                      Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                      return;
                    }
                  });
                  if (Mostrecent.length) {
                    let indix = Mostrecent[0].budgetDetails.findIndex(o => (o.category) == (data.category));
                    if (indix != -1) {
                      Mostrecent[0].budgetDetails[indix].available = (Mostrecent[0].budgetDetails[indix].available + amount);
                      Mostrecent[0].budgetDetails[indix].budgeted = (Mostrecent[0].budgetDetails[indix].budgeted + amount);
                    }
                    var assignmentAmt = index2 != -1 ? existingBudgetDetails[index2].available : amount;
                    assignmentAmt = Math.abs(assignmentAmt);
                    let indx = Mostrecent[0].budgetDetails.findIndex(o => (o.category) === (newCat.category));
                    if (indx != -1) {
                      Mostrecent[0].budgetDetails[indx].available = (Mostrecent[0].budgetDetails[indx].available - assignmentAmt);
                      Mostrecent[0].budgetDetails[indx].budgeted = Mostrecent[0].budgetDetails[indx].budgeted - assignmentAmt;
                    }
                    else {
                      Mostrecent[0].budgetDetails.push({
                        "category": newCat.category,
                        "category_id": newCat.category_id,
                        "budgeted": -assignmentAmt,
                        "spent": 0,
                        "available": -assignmentAmt,
                        "transactions": []
                      })
                    }
                    var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                    var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                      return a + b;
                    }, 0);
                    var recentsurplusAmount = Mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                      return a + b;
                    }, 0);
                    var recentBudgeted = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                      return a + b;
                    }, 0);
                    incomeref.doc(paycheckEle.incomeid).collection("paychecks").doc(Mostrecent[0].id).update({
                      budgetDetails: Mostrecent[0].budgetDetails,
                      budgetsToBeBudgeted: recentReceived - recentBudgeted + recentsurplusAmount,
                      budgetsCurrent: recentBudgeted,
                      isOverbudget: recentReceived - recentBudgeted < 0 ? true : false,
                      budgetsAvailable: recentReceived - recentspentAmount + recentsurplusAmount,
                      isOverspent: (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                    });
                    updateTransactionCategory(data, newCat);
                  }
                  else {
                    updateTransactionCategory(data, newCat);
                  }
                })
              }
              function updateTransactionCategory(data, newCat) {
                userTransactions.doc(data.id).get().then(function (usertra) {
                  if (usertra.exists) {
                    var user_transactions = usertra.data();
                    user_transactions.category = newCat.category;
                    user_transactions.category_id = newCat.category_id;
                    userTransactions.doc(data.id).update({ category: user_transactions.category, category_id: user_transactions.category_id }).then(() => {
                      if (data.plaid_type) {
                        var splitCat = newCat.category.split(" ");
                        plaid_transactions.doc(data.plaidTransId).get().then(function (user_plaid) {
                          if (user_plaid.exists) {
                            var user_plaid_trans = user_plaid.data();
                            user_plaid_trans.category = splitCat;
                            plaid_transactions.doc(data.plaidTransId).update({ category: [user_transactions.category], categoryName: newCat.category, category_id: user_transactions.category_id }).then(pl => {
                              resolve({
                                success: true,
                                message: "UPDATE CATEGORY"
                              })
                            })
                          }
                          else {
                            resolve({
                              success: true,
                              message: "UPDATE CATEGORY"
                            })
                          }
                        })
                      }
                      else {
                        resolve({
                          success: true,
                          message: "UPDATE CATEGORY"
                        })
                      }
                    })
                  }
                  else {
                    resolve(
                      { success: false, message: "Transaction not Exist" }
                    );
                  }
                })
              }
            }
            else {
              resolve(
                { success: false, message: "Paycheck not Found" }
              );
            }

          })
        });
      }
      else if (data.paycheck) {
        var payCheckRef = incomeref.doc(data.paycheck.incomeid).collection('paychecks').doc(data.paycheck.id);
        payCheckRef.get().then(snap => {
          if (snap.exists) {
            var paycheckRec = snap.data();
            if (data.type === "income") {
              updateTransactionCategory(data, newCat);
            }
            else {
              var existingBudgetDetails = paycheckRec.budgetDetails;
              let index1 = existingBudgetDetails.findIndex(o => o.category === data.category);
              let index2 = existingBudgetDetails.findIndex(o => o.category === newCat.category);
              var amount = data.assignment.map(o => o.amount).reduce(function (a, b) {
                return a + b;
              }, 0);
              if (index1 != -1) {
                existingBudgetDetails[index1].spent = existingBudgetDetails[index1].spent - amount;
                existingBudgetDetails[index1].available = existingBudgetDetails[index1].available + amount;
                existingBudgetDetails[index1].transactions = existingBudgetDetails[index1].transactions.filter(o => o != data.id)
              }
              if (index2 != -1) {
                existingBudgetDetails[index2].spent = existingBudgetDetails[index2].spent + amount;
                existingBudgetDetails[index2].available = existingBudgetDetails[index2].available - amount;
                existingBudgetDetails[index2].transactions.push(data.id);
              }
              else {
                existingBudgetDetails.push({
                  "category": newCat.category,
                  "category_id": newCat.category_id,
                  "budgeted": 0,
                  "spent": amount,
                  "available": -amount,
                  "transactions": [data.id]
                })
              }
              var totalReceived = paycheckRec.totalReceived === 0 ? paycheckRec.totalExpected : paycheckRec.totalReceived;
              var totalspentAmount = existingBudgetDetails.map(o => o.spent).reduce(function (a, b) {
                return a + b;
              }, 0);
              var totalsurplusAmount = paycheckRec.surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                return a + b;
              }, 0);
              payCheckRef.update({
                budgetDetails: existingBudgetDetails,

              });
              incomeref.doc(data.paycheck.incomeid).collection("paychecks").get().then((paychecksDocs) => {
                var Mostrecent = [];
                paychecksDocs.docs.filter(o => {
                  if (o.data().payDateTimeStamp > paycheckRec.payDateTimeStamp && o.data().payDateTimeStamp <= new Date().getTime()) {
                    Mostrecent.push(Object.assign({ id: o.id }, o.data()));
                    Mostrecent = Mostrecent.sort((a, b) => b.payDateTimeStamp - a.payDateTimeStamp)
                    return;
                  }
                });
                if (Mostrecent.length) {
                  let indix = Mostrecent[0].budgetDetails.findIndex(o => (o.category) == (data.category));
                  if (indix != -1) {
                    Mostrecent[0].budgetDetails[indix].available = (Mostrecent[0].budgetDetails[indix].available + amount);
                    Mostrecent[0].budgetDetails[indix].budgeted = (Mostrecent[0].budgetDetails[indix].budgeted + amount);
                  }
                  var assignmentAmt = index2 != -1 ? existingBudgetDetails[index2].available : amount;
                  assignmentAmt = Math.abs(assignmentAmt);
                  let indx = Mostrecent[0].budgetDetails.findIndex(o => (o.category) === (newCat.category));
                  if (indx != -1) {
                    Mostrecent[0].budgetDetails[indx].available = (Mostrecent[0].budgetDetails[indx].available - assignmentAmt);
                    Mostrecent[0].budgetDetails[indx].budgeted = Mostrecent[0].budgetDetails[indx].budgeted - assignmentAmt;
                  }
                  else {
                    Mostrecent[0].budgetDetails.push({
                      "category": newCat.category,
                      "category_id": newCat.category_id,
                      "budgeted": -assignmentAmt,
                      "spent": 0,
                      "available": -assignmentAmt,
                      "transactions": []
                    })
                  }
                  var recentReceived = Mostrecent[0].totalReceived === 0 ? Mostrecent[0].totalExpected : Mostrecent[0].totalReceived;
                  var recentspentAmount = Mostrecent[0].budgetDetails.map(o => o.spent).reduce(function (a, b) {
                    return a + b;
                  }, 0);
                  var recentsurplusAmount = Mostrecent[0].surplusBudgetTemplate.map(o => o.amount).reduce(function (a, b) {
                    return a + b;
                  }, 0);
                  var recentBudgeted = Mostrecent[0].budgetDetails.map(o => o.budgeted).reduce(function (a, b) {
                    return a + b;
                  }, 0);
                  incomeref.doc(data.paycheck.incomeid).collection("paychecks").doc(Mostrecent[0].id).update({
                    budgetDetails: Mostrecent[0].budgetDetails,
                    budgetsToBeBudgeted: recentReceived - recentBudgeted + recentsurplusAmount,
                    budgetsCurrent: recentBudgeted,
                    isOverbudget: recentReceived - recentBudgeted < 0 ? true : false,
                    budgetsAvailable: recentReceived - recentspentAmount + recentsurplusAmount,
                    isOverspent: (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                  });
                  updateTransactionCategory(data, newCat);
                }
                else {
                  updateTransactionCategory(data, newCat);
                }
              })
            }
            function updateTransactionCategory(data, newCat) {
              userTransactions.doc(data.id).get().then(function (usertra) {
                if (usertra.exists) {
                  var user_transactions = usertra.data();
                  user_transactions.category = newCat.category;
                  user_transactions.category_id = newCat.category_id;
                  userTransactions.doc(data.id).update({ category: user_transactions.category, category_id: user_transactions.category_id }).then(() => {
                    if (data.plaid_type) {
                      plaid_transactions.doc(data.plaidTransId).get().then(function (user_plaid) {
                        if (user_plaid.exists) {
                          var user_plaid_trans = user_plaid.data();
                          user_plaid_trans.category = newCat.category;
                          plaid_transactions.doc(data.plaidTransId).update({ category: user_transactions.category, categoryName: newCat.category, category_id: user_transactions.category_id }).then(pl => {
                            resolve({
                              success: true,
                              message: "UPDATE CATEGORY"
                            })
                          })
                        }
                      })
                    }
                    else {
                      resolve({
                        success: true,
                        message: "UPDATE CATEGORY"
                      })
                    }
                  })
                }

              })
            }
          }
          else {
            resolve(
              { success: false, message: "Paycheck not Found" }
            );
          }

        })
      }
    })
  }
  changePaychecks(old, _new, transaction) {
    var me = this;
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
        var totalDays = Math.floor((30 / 100) * (((totalTime - typeRecurresion)) * 100));
        var date = new Date().setDate(new Date().getDate() + (totalDays + (typeRecurresion * type)));
        return new Date(date);
      }
    }
    function getAchiveDebtDateFormula(payPermonth, totalAmount, type) {
      if (payPermonth && totalAmount) {
        let totalTime = totalAmount / payPermonth;
        let typeRecurresion = Math.floor(totalTime);
        var totalDays = Math.floor((30 / 100) * (((totalTime - typeRecurresion)) * 100));
        var date = new Date().setDate(new Date().getDate() + (totalDays + (typeRecurresion * type)));
        return new Date(date);
      }
    }
    return new Promise<any>((resolve, reject) => {
      const incomeRef = firebase.firestore().collection("income_source").doc(firebase.auth().currentUser.uid).collection("incomes");
      const userTransaction = firebase.firestore().collection('user_transaction').doc(firebase.auth().currentUser.uid).collection('transactions');
      const userplaidTransaction = firebase.firestore().collection('user_plaid_transaction').doc(firebase.auth().currentUser.uid).collection('transactions');
      const goalRef = firebase.firestore().collection("users").doc(firebase.auth().currentUser.uid).collection("goals");
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
              totalReceived: firebase.firestore.FieldValue.increment(- Math.abs(old.amount)),
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
                  }).catch(function () {
                    resolve({ success: false })
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
                      totalReceived: firebase.firestore.FieldValue.increment(Math.abs(old.amount)),
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
                          }).catch(function () {
                            updateTransactionPaycheckID(previous, next, trans);
                          });
                        }
                        else {
                          updateTransactionPaycheckID(previous, next, trans);
                        }


                      }).catch(function () {
                        updateTransactionPaycheckID(previous, next, trans);
                      })
                    }).catch(function () {
                      resolve({ success: false })
                    });
                  }).catch(function () {
                    resolve({ success: false })
                  });
                }
              });

            }).catch(function () {
              resolve({ success: false });
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
                      resolve({ success: true });
                    }
                    else {
                      resolve({ success: false });
                    }
                  }).catch(err => resolve({ success: false }))
                }
                else {
                  let i = usrTransaction.assignment.findIndex(o => o.paycheckId === old.id);
                  if (i != -1) {
                    usrTransaction.assignment[i].paycheckId = _new.paycheckId;
                    userTransaction.doc(transaction.id).update({ assignment: usrTransaction.assignment });
                    resolve({ success: true });
                  }
                  else {
                    resolve({ success: false });
                  }
                }

              }).catch(function () {
                resolve({ success: false });
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
                    "budgetsAvailable": recentReceived - recentspentAmount + recentsurplusAmount,
                    "budgetsToBeBudgeted": recentReceived - recentbudgetedAmount + recentsurplusAmount,
                    "isOverbudget": (recentReceived - recentbudgetedAmount + recentsurplusAmount) < 0 ? true : false,
                    "isOverspent": (recentReceived - recentspentAmount + recentsurplusAmount) < 0 ? true : false
                  }).then(() => {
                    assignNewPaycheck(old, _new, transaction);
                  }).catch(function () {
                    resolve({ success: false })
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
                                resolve({ success: true });
                              }
                              else {
                                resolve({ success: false });
                              }
                            })
                          }
                          else {
                            let i = usrTransaction.assignment.findIndex(o => o.paycheckId === previous.id);
                            if (i != -1) {
                              usrTransaction.assignment[i].paycheckId = next.paycheckId;
                              userTransaction.doc(transaction.id).update({ assignment: usrTransaction.assignment });
                              resolve({ success: true });
                            }
                            else {
                              resolve({ success: false });
                            }
                          }

                        }).catch(function () {
                          resolve({ success: false });
                        })
                      }
                    }).catch(function () {
                      resolve({ success: false });
                    })
                  }).catch(function () {
                    resolve({ success: false })
                  });
                }
              });
            }).catch(function () {
              resolve({ success: false })
            });
          }
        }).catch(function (err) {
          reject();
        })
      }
    })
  }
  markPaycheck(id) {
    var that = this;
    that.storage.get('incomeSource').then((oldStorage) => {
      if (oldStorage) {
        oldStorage.forEach(income => {
          income.paychecks.forEach(paycheck => {
            if (paycheck.markedToLatestAssign === true && paycheck.id != id) {
              firebase.firestore().collection('income_source').doc(firebase.auth().currentUser.uid).collection('incomes').doc(income.id).collection('paychecks').doc(paycheck.id).update({ 'markedToLatestAssign': false });
            }
            if (paycheck.id === id) {
              firebase.firestore().collection('income_source').doc(firebase.auth().currentUser.uid).collection('incomes').doc(income.id).collection('paychecks').doc(paycheck.id).update({ 'markedToLatestAssign': true });
            }
          });
        });
      }
    });
  }
  deleteAccountTransaction(data) {
    var me = this;
    return new Promise<any>((resolve, reject) => {
      const body = data
      const query = firebase.firestore().collection('user_plaid_transaction').doc(firebase.auth().currentUser.uid).collection('transactions').where("account_id", "==", body.account_id);
      const plaidquery = firebase.firestore().collection('user_plaid_transaction').doc(firebase.auth().currentUser.uid).collection('transactions')
      query.get().then(function (snap) {
        if (snap.docs.length) {
          let count = 0;
          var transactions = snap.docs.map(o => o.id);
          if (transactions[count]) {
            removetransactioncall(transactions[count]);
          }
          function removetransactioncall(id) {
            me.api.deletePlaidtransaction(id).then(res => {
              count++;
              if (count != transactions.length && transactions[count]) {
                removetransactioncall(transactions[count]);
              }
              else {
                resolve({
                  success: true,
                  error: " Plaid transactions deleted"
                })
              }

            }).catch(e => reject(e))
          }

        }
        else {
          resolve({
            success: true,
            message: "No Plaid transactions exists"
          });
        }
      })
        .catch(function (error) {
          resolve({
            success: false,
            error: error
          });
        });

    })
  }
  removeLocalStorage(tablename, plaid, id) {
    var me = this;
    var response = [];
    me.storage.get(tablename).then((res) => {
      if (res && !plaid) {
        response = res;
        var index = response['transactions'].map(x => {
          return x.id;
        }).indexOf(id);
        if (index != -1) {
          response['transactions'].splice(index, 1);
          me.storage.set(tablename, response);
          me.events.publish("delete:transaction", { time: new Date() })
        }

      }
      if (res && plaid) {
        response = res;
        var index = response.map(x => {
          return x.id;
        }).indexOf(id);
        if (index != -1) {
          response.splice(index, 1);
          me.storage.set(tablename, response);
          me.events.publish("refresh:plaidtransaction", { time: new Date() })
        }

      }
    }).catch((err) => {

    })
  }
  addIncomesourceToExisting(req, data, slectedIncome) {
    return new Promise<any>((resolve, reject) => {
      const payDates = req.date;
      const dayDifference = req.dayDifferance;
      var mergedIncome = [];
      var paycheckDates = [];
      const incomeRef = firebase.firestore().collection('income_source').doc(firebase.auth().currentUser.uid).collection('incomes').doc(slectedIncome);
      let count = 0;
      updatePaycheckBudget(payDates[count])
      function updatePaycheckBudget(start_Date) {
        count++;
        if (start_Date) {
          incomeRef.get().then((snapShots) => {
            var assignIncomeSource = Object.assign({ id: snapShots }, { paychecks: [] }, snapShots.data())
            incomeRef.collection('paychecks').get().then((paySnap) => {
              paySnap.docs.map(o => assignIncomeSource.paychecks.push(Object.assign({ id: o.id }, o.data())));
              if (assignIncomeSource && assignIncomeSource.paychecks.length) {
                var filteredPaychecks = [];
                mergedIncome = assignIncomeSource.mergedIncome;
                assignIncomeSource.paychecks.forEach((o, index) => {
                  if (new Date(o.payDate.toDate().toLocaleDateString()).getTime() <= new Date(start_Date).getTime()) {
                    let diff = new DateDiff(start_Date, new Date(o.payDate.toDate().toLocaleDateString()));
                    let days = diff.days();
                    console.log(days);
                    if (days <= dayDifference) {
                      filteredPaychecks.push(o);
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
                    add_income.push({
                      "name": data.paycheckName,
                      "isRepeating": data.incomeType == "recurring" ? true : false,
                      "repeatingType": data.paycheckFrequency,
                      "startDate": `${start_Date.getFullYear()}-${start_Date.getMonth() + 1}-${start_Date.getDate()}`,
                      "income": data.payAmount,
                    })
                    if (data.incomeType == "recurring" && count === payDates.length) {
                      mergedIncome.push({
                        "name": data.paycheckName,
                        "isRepeating": data.incomeType == "recurring" ? true : false,
                        "repeatingType": data.paycheckFrequency,
                        "startDate": data.payDate,
                        "income": data.payAmount,
                        "dayDifference": dayDifference,
                        "payDates": []
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
                      var params = {
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
                      updateIncome(params);
                    }
                    if (data.incomeType != "recurring") {
                      var params = {
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
                      updateIncome(params);
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

                          resolve({
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
                                dataEle.mergedIncome[dataEle.mergedIncome.length - 1].payDates = paycheckDates;
                                incomeRef.update({
                                  "mergedIncome": dataEle.mergedIncome,
                                }).then(() => {
                                  updateMostrecent();
                                }).catch(() => {
                                  updateMostrecent();
                                });
                              }
                              else {
                                updatePaycheckBudget(payDates[count]);
                              }
                            }
                            else {
                              if (count === payDates.length) {
                                dataEle.mergedIncome[dataEle.mergedIncome.length - 1].payDates = paycheckDates;
                                incomeRef.update({
                                  "mergedIncome": dataEle.mergedIncome
                                }).then(() => {
                                  updateMostrecent();
                                }).catch(() => {
                                  updateMostrecent();
                                });
                              }
                              else {
                                updatePaycheckBudget(payDates[count]);
                              }
                            }
                          }
                          else {
                            if (count === payDates.length) {
                              dataEle.mergedIncome[dataEle.mergedIncome.length - 1].payDates = paycheckDates;
                              incomeRef.update({
                                "mergedIncome": dataEle.mergedIncome
                              }).then(() => {
                                updateMostrecent();
                              }).catch(() => {
                                updateMostrecent();
                              });
                            }
                            else {
                              updatePaycheckBudget(payDates[count]);
                            }
                          }
                        });
                      }).catch((err) => {
                        if (count === payDates.length) {
                          //  resolve section
                          resolve({
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
                        "payDates": paycheckDates.length ? paycheckDates : []
                      });
                      incomeRef.update({
                        "mergedIncome": mergedIncome
                      })
                      // resolve section
                      resolve({
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
                reject();

              }
            }).catch((err) => {
              console.log("paycheck", err)
              reject();
            });

          }).catch((err) => {
            console.log("income", err)
            reject();
          });
        }
        else {
          updatePaycheckBudget(payDates[count]);
        }
      }
    })
  }

  accountStatus(token) {
    return firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).collection('failedToken').get().then((tokenSnap) => {
      if (tokenSnap.docs.length) {
        var auth_tokens = tokenSnap.docs[0].data().auth_tokens;
        let index = auth_tokens.findIndex(o => o.access_token == token);
        if (index != -1) {
          return {
            flag: true,
            lastSuccess: auth_tokens[index].lastConnection ? auth_tokens[index].lastConnection : new Date().setMonth(new Date().getMonth() - 1)
          }
        } else {
          return {
            flag: false
          }
        }
      }
      else {
        return {
          flag: false
        }
      }
    }).catch(err => {
      return {
        flag: false
      }
    })
  }
  saveTokenForSimilarAccounts(new_accesstoken, old_accesstoken, accountsArray, lastConnectionDate) {
    var me = this;
    return new Promise((resolve, reject) => {
      firebase.firestore().collection('accounts').doc(firebase.auth().currentUser.uid).collection('bank_account')
        .where("accounts_tokens", "==", old_accesstoken).get().then((tokenSnap) => {
          if (tokenSnap.docs.length) {
            var matched = 0;
            tokenSnap.docs.forEach(function (tokendoc, indexToken) {
              let account = tokendoc.data();
              if (accountsArray.findIndex(o => o.name == account.name && o.official_name == account.official_name && o.subtype == account.subtype)) {
                matched++;
                firebase.firestore().collection('accounts').doc(firebase.auth().currentUser.uid).collection('bank_account').doc(tokendoc.id)
                  .update({
                    accounts_tokens: new_accesstoken,
                    balances: account.balances
                  })
                let displayForm = new Date().toISOString().substring(0, 10);
                let displayTo = new Date(lastConnectionDate).toISOString().substring(0, 10);
                me.saveTransaction(new_accesstoken, tokendoc.id, account.type, { displayForm: displayForm, displayTo: displayTo }).then(() => {
                  if ((tokenSnap.docs.length - 1) == indexToken && matched > 0) {
                    resolve({
                      success: true,
                      message: "account activated successfully!"
                    })
                  }
                }).catch(() => {
                  if ((tokenSnap.docs.length - 1) == indexToken && matched > 0) {
                    resolve({
                      success: true,
                      message: "account activated successfully!"
                    })
                  }
                })
              }
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
  deleteToken(token) {
    var tokenRef = firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).collection('failedToken');
    tokenRef.get().then((tokenSnap) => {
      if (tokenSnap.docs.length) {
        var auth_tokens = tokenSnap.docs[0].data().auth_tokens;
        auth_tokens = auth_tokens.filter(o => o.access_token != token);
        if (auth_tokens.length) {
          tokenRef.doc(tokenSnap.docs[0].id).update({
            auth_tokens: auth_tokens
          })
        } else {
          tokenRef.doc(tokenSnap.docs[0].id).delete();
        }
      }
    }).catch(err => {
      console.log(err);
    })
  }
}