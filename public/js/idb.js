// create variable to hold db connection
let db;
// establish a connection IndexedDB database called "budget_tracker" and set it to version 1
const request = indexedDB.open("budget_tracker", 1);

// this event will emit if the database version changes (nonexistant to version 1, v1 to v2, etc.)
request.onupgradeneeded = function (event) {
	// save a reference to the database
	const db = event.target.result;
	// create an object store (table) called "new_item", set it to have auto incrementing primary key of sorts
	db.createObjectStore("new_item", { autoIncrement: true });
};

// upon a successful
request.onsuccess = function (event) {
	// when db is successfully created with its object store (from onupgradedneeded event above) or simply established a connection, save reference to db in global variable
	db = event.target.result;

	// check if app is online, if yes run populateTotal(), populateTable(), populateChart();
	if (navigator.onLine) {
		uploadItem();
	}
};

request.onerror = function (event) {
	// log error here
	console.log(event.target.errorCode);
};

// This function will be executed if we attempt to submit a new line item and there's no internet connection
function saveRecord(record) {
	// open a new transaction with the database with read and write permissions
	const transaction = db.transaction(["new_item"], "readwrite");

	// access the object store for "new_item"
	const budgetObjectStore = transaction.objectStore("new_item");

	// add record to your store with add method
	budgetObjectStore.add(record);
}

function uploadItem() {
	// open a transaction on db
	const transaction = db.transaction(["new_item"], "readwrite");

	// access the object store
	const budgetObjectStore = transaction.objectStore("new_item");

	// get all records from object store and set to a variable
	const getAll = budgetObjectStore.getAll();

	getAll.onsuccess = function () {
		// if there was data in indexedDb's store, send it to the api server
		if (getAll.result.length > 0) {
			fetch("/api/transaction/bulk", {
				method: "POST",
				body: JSON.stringify(getAll.result),
				headers: {
					Accept: "application/json, text/plain, */*",
					"Content-Type": "application/json",
				},
			})
				.then((response) => response.json())
				.then((serverResponse) => {
					if (serverResponse.message) {
						throw new Error(serverResponse);
					}
					// delete records if successful
					const transaction = db.transaction(["new_item"], "readwrite");
					const budgetObjectStore = transaction.objectStore("new_item");
					budgetObjectStore.clear();
				})
				.catch((err) => {
					console.log(err);
				});
		}
	};
}

// listen for app to come back online
window.addEventListener("online", uploadItem);
