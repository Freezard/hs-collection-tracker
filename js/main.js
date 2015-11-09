/*  main.js
    Hearthstone Collection Tracker
*/
var HSCollectionTracker = (function() {
	/*********************************************************
	***************************DATA***************************
	*********************************************************/
	var classesEnum = {
		neutral: "neutral",
		druid: "druid",
		hunter: "hunter",
		mage: "mage",
		paladin: "paladin",
		priest: "priest",
		rogue: "rogue",
		shaman: "shaman",
		warlock: "warlock",
		warrior: "warrior"
	};
			
	var raritiesEnum = {
		free: "free",
		common: "common",
		rare: "rare",
		epic: "epic",
		legendary: "legendary"
	};
	
	// Values = the number of cards in each set
	var setsEnum = {
		basic: {
		    free: {
				neutral: 86,
				other: 20,
				total: 266
			}
		},
		classic: {
		    common: {
				neutral: 80,
				other: 12,
				total: 188
			},
			rare: {
				neutral: 72,
				other: 10,
				total: 162
			},
			epic: {
				neutral: 20,
				other: 6,
				total: 74
			},
			legendary: {
				neutral: 24,
				other: 1,
				total: 33
			}
		},
		reward: {
			epic: {
				neutral: 2,
				total: 2
			},
			legendary: {
				neutral: 1,
				total: 1
			}
		},
		promo: {
			legendary: {
				neutral: 2,
				total: 2
			}
		},
		naxxramas: {
		    common: {
				neutral: 18,
				other: 2,
				total: 36
			},
			rare: {
				neutral: 8,
				other: 0,
				total: 8
			},
			epic: {
				neutral: 4,
				other: 0,
				total: 4
			},
			legendary: {
				neutral: 6,
				other: 0,
				total: 6
			}
		},
		gvg: {
		    common: {
				neutral: 44,
				other: 4,
				total: 80
			},
			rare: {
				neutral: 20,
				other: 6,
				total: 74
			},
			epic: {
				neutral: 16,
				other: 4,
				total: 52
			},
			legendary: {
				neutral: 11,
				other: 1,
				total: 20
			}
		},
		blackrock: {
		    common: {
				neutral: 12,
				other: 2,
				total: 30
			},
			rare: {
				neutral: 4,
				other: 2,
				total: 22
			},
			legendary: {
				neutral: 5,
				total: 5
			}
		},
		tgt: {
		    common: {
				neutral: 44,
				other: 6,
				total: 98
			},
			rare: {
				neutral: 18,
				other: 6,
				total: 72
			},
			epic: {
				neutral: 18,
				other: 4,
				total: 54
			},
			legendary: {
				neutral: 10,
				hunter: 2,
				other: 1,				
				total: 20
			}
		}
	};
	
	var setsSoulbound = {
		basic: "both",
		classic: "none",
		reward: "both",
		promo: "golden",
		naxxramas: "normal",
		gvg: "none",
		blackrock: "normal",
		tgt: "none"
	};
	
	var packsEnum = {
		classic: "classic",
		gvg: "gvg",
		tgt: "tgt"
	};
	
	// Values = normal and golden cards
	var craftingCosts = {
		free: [0, 0],
		common: [40, 400],
		rare: [100, 800],
		epic: [400, 1600],
		legendary: [1600, 3200]
	};
	
	// Values = normal and golden cards
	var disenchantmentValue = {
		free: [0, 0],
		common: [5, 50],
		rare: [20, 100],
		epic: [100, 400],
		legendary: [400, 1600]
	};
	
	// Values = normal and golden cards
	var chanceOfGetting = {
		free: [0, 0],
		common: [0.70, 0.0147],
		rare: [0.214, 0.0137],
		epic: [0.0428, 0.003],
		legendary: [0.0108, 0.001]
	};

	var missingCards = {};
	var missingDust = {};

	var classes = {};
	var selectedClass = "neutral";
	var selectedCardQuality = "normal";
	var settings = {
		excludeGoldenCards: false,
		showOnlyMissingCards: false
	};
	var filter = "all";
	
	var currentDust = 0;
	var disenchantedDust = 0;
	
	var version = 1.05;
	
	function card(name, rarity, mana, type, className, set, soulbound) {
		this.name = name;
		this.rarity = rarity;
		this.mana = mana;
		this.type = type;
		this.className = className;
		this.set = set;
		this.soulbound = soulbound;
		this.normal = 0;
		this.golden = 0;
	}
		
	function classHS(name) {
		this.name = name;
		this.level = 1;
		this.cards = {
			free: {},
			common: {},
			rare: {},
			epic: {},
			legendary: {}
		};
		this.addCard = function(card) {
			this.cards[card.rarity][card.name] = card;
			var cardCopies = getCardCopies(card.rarity);
			
			missingCards.classes[name][card.set][card.rarity][0] += cardCopies;
			missingCards.classes[name][card.set][card.rarity][1] += cardCopies;
			missingCards.classes[name][card.set].total[0] += cardCopies;
			missingCards.classes[name][card.set].total[1] += cardCopies;
			
			missingCards.total[card.set][card.rarity][0] += cardCopies;
			missingCards.total[card.set][card.rarity][1] += cardCopies;
			missingCards.total[card.set].total[0] += cardCopies;
			missingCards.total[card.set].total[1] += cardCopies;
			missingCards.total.total[0] += cardCopies;
			missingCards.total.total[1] += cardCopies;		
			
			if (card.soulbound === "none" || card.soulbound === "normal") {
				var craftingCostGolden = craftingCosts[card.rarity][1] * cardCopies;
				
				missingDust.classes[name][card.rarity][1] += craftingCostGolden;
				missingDust.classes[name].total[1] += craftingCostGolden;
				
				missingDust.total[card.rarity][1] += craftingCostGolden;
				missingDust.total.total[1] += craftingCostGolden;
			}
			if (card.soulbound === "none" || card.soulbound === "golden") {
				var craftingCostNormal = craftingCosts[card.rarity][0] * cardCopies;
				
				missingDust.classes[name][card.rarity][0] += craftingCostNormal;
				missingDust.classes[name].total[0] += craftingCostNormal;
				
				missingDust.total[card.rarity][0] += craftingCostNormal;
				missingDust.total.total[0] += craftingCostNormal;
			}
		}
	}
	/*********************************************************
	**************************UTILS***************************
	*********************************************************/
	// Sorts all the card lists for the specified class
	// Sorting order: Mana cost: Lower > higher
	// Type: Weapon > spell > minion
	// Name: Lexicographical order
	function sortCards(className) {
		var cardList = classes[className].cards;
		
		for (var rarity in cardList) {
			var sortedArray = [];
			for (var name in cardList[rarity]) {
				sortedArray.push([name, cardList[rarity][name]]);
			}
			sortedArray.sort(function(a, b) {
			    return a[1].mana == b[1].mana ?
				a[1].type === b[1].type ?
				a[1].name.localeCompare(b[1].name) :
				a[1].type === "weapon" ? -1 :
				b[1].type === "weapon" ? 1 :
				a[1].type === "spell" ? -1 :
				1 :	a[1].mana - b[1].mana;
				});
			
			var sortedList = {};
			for (var i = 0; i < sortedArray.length; ++i)
				if (sortedArray[i] !== undefined)
					sortedList[sortedArray[i][0]] = sortedArray[i][1];
		
			cardList[rarity] = sortedList;
		}
	}
	
	function readTextFile(fileName) {
		var rawFile;
		var allText = "";
		if (window.XMLHttpRequest) {
			// code for IE7+, Firefox, Chrome, Opera, Safari
			rawFile = new XMLHttpRequest();
		}
		else {
			// code for IE6, IE5
			rawFile = new ActiveXObject("Microsoft.XMLHTTP");
		}
		rawFile.open("GET", "data/" + fileName, false);
		rawFile.onreadystatechange = function () {
			if(rawFile.readyState === 4) {
				if(rawFile.status === 200 || rawFile.status == 0) {
					allText = rawFile.responseText;
				}
			}
		}
		rawFile.send(null);
			
		return allText;
	}
	
	function importCards(set) {
		var cardData = readTextFile(set + ".txt");
		cardData = cardData.replace(/(\r)/gm, "");
		var cardLines = cardData.split("\n");
		var cardClass;
		for (var i = 0; i < cardLines.length; i++) {
			var cardLine = cardLines[i].split(",");
			if (cardLine.length == 1 && cardLine != "") {
				cardClass = cardLine[0];
			}
			else if (cardLine != "") {
				classes[cardClass].addCard(new card(cardLine[0], cardLine[1], cardLine[2], cardLine[3], cardClass, set, setsSoulbound[set]));
			}
		}
	}	
	
	function capitalizeFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}
	
	function addThousandSeparator(number) {
		return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	}
	/*********************************************************
	**********************CARD FUNCTIONS**********************
	*********************************************************/
	function updateNormalCard(card, number) {
		missingCards.classes[card.className][card.set][card.rarity][0] -= number;
		missingCards.classes[card.className][card.set].total[0] -= number;
		missingCards.total[card.set][card.rarity][0] -= number;
		missingCards.total[card.set].total[0] -= number;
		missingCards.total.total[0] -= number;
		
		if (card.soulbound === "none" || card.soulbound === "golden") {
		    var craftingCost = craftingCosts[card.rarity][0] ;
		
		    updateMissingDust(card, craftingCost * number, "normal");
		}
	}
	
	function updateGoldenCard(card, number) {
		missingCards.classes[card.className][card.set][card.rarity][1] -= number;
		missingCards.classes[card.className][card.set].total[1] -= number;
		missingCards.total[card.set][card.rarity][1] -= number;
		missingCards.total[card.set].total[1] -= number;
		missingCards.total.total[1] -= number;
		
		if (card.soulbound === "none" || card.soulbound === "normal") {
		    var craftingCost = craftingCosts[card.rarity][1];
		
		    updateMissingDust(card, craftingCost * number, "golden");
		}
	}
	
	function updateMissingDust(card, craftingCost, cardQuality) {		
		if (cardQuality === "normal") {
			missingDust.classes[card.className][card.rarity][0] -= craftingCost;
		    missingDust.classes[card.className].total[0] -= craftingCost;
		    missingDust.total[card.rarity][0] -= craftingCost;
		    missingDust.total.total[0] -= craftingCost;
		}
		else if (cardQuality === "golden") {
			missingDust.classes[card.className][card.rarity][1] -= craftingCost;
		    missingDust.classes[card.className].total[1] -= craftingCost;
			missingDust.total[card.rarity][1] -= craftingCost;
		    missingDust.total.total[1] -= craftingCost;
		}
	}
	
	// Adds a card through clicking on an <li><a> element
	function addCard(element, card) {
		if (card[selectedCardQuality] < getCardCopies(card.rarity)) {
			updateCard(card, 1);
			
		    var re = new RegExp(selectedCardQuality + "\\d");
		    element.setAttribute("class", element.getAttribute("class").replace(re, selectedCardQuality + card[selectedCardQuality]));			
			
		    updateLocalStorage();
		    updateMissingCardsView(card.rarity, 1);
		    updateMissingDustView(card.rarity);			
			
			displayCards(selectedClass);
			
			return true;
		}
		
		return false;
	}
	
	function addAll(element) {
		var list = element.parentNode.parentNode.getElementsByTagName("a");
		var rarity = element.parentNode.parentNode.id;		
		rarity = rarity.slice(5, rarity.length);
		
		var cardCopies = getCardCopies(rarity);
		
		for (var i = 1, len = list.length; i < len; i++) {			
			var card = classes[selectedClass].cards[rarity][list[i].innerHTML];
			
			if (card[selectedCardQuality] < getCardCopies(card.rarity))
			    updateCard(card, cardCopies - card[selectedCardQuality]);
		}
		
		updateLocalStorage();
		displayTracker();
	}
	
	function removeAll(element) {
		var list = element.parentNode.parentNode.getElementsByTagName("a");
		var rarity = element.parentNode.parentNode.id;		
		rarity = rarity.slice(5, rarity.length);
		
		var cardCopies = getCardCopies(rarity);
		
		for (var i = 1, len = list.length; i < len; i++) {			
			var card = classes[selectedClass].cards[rarity][list[i].innerHTML];
			
			if (card[selectedCardQuality] > 0)
			    updateCard(card, -card[selectedCardQuality]);
		}
		
		updateLocalStorage();
		displayTracker();
	}
	
	function removeCard(element, card) {
		if (card[selectedCardQuality] > 0) {
		    updateCard(card, -1);
		
		    var re = new RegExp(selectedCardQuality + "\\d");
		    element.setAttribute("class", element.getAttribute("class").replace(re, selectedCardQuality + card[selectedCardQuality]));
		
			updateLocalStorage();
		    updateMissingCardsView(card.rarity, -1);
		    updateMissingDustView(card.rarity);
		
		    displayCards(selectedClass);
		
		    return false;
		}
		
		return false;
	}
	
	function updateCard(card, number) {
	    card[selectedCardQuality] += number;
		
		if (selectedCardQuality === "normal")
				updateNormalCard(card, number);
		else updateGoldenCard(card, number);
	}
	
	function getCardCopies(rarity) {
		return rarity === "legendary" ? 1 : 2;
	}
	/*********************************************************
	*************************DISPLAY**************************
	*********************************************************/
	function updateLocalStorage() {
		localStorage.setItem('classes', JSON.stringify(classes));
		localStorage.setItem('missingCards', JSON.stringify(missingCards));
		localStorage.setItem('missingDust', JSON.stringify(missingDust));
	}
	
	function updateMissingCardsView(rarity, number) {
		if (settings.excludeGoldenCards && selectedCardQuality === "golden")
			return;
		
		var rarityCapitalized = capitalizeFirstLetter(rarity);
		var cardQualityCapitalized = capitalizeFirstLetter(selectedCardQuality);
		
		document.getElementById("classMissing" + rarityCapitalized + cardQualityCapitalized).innerHTML -= number;
		document.getElementById("classMissingTotal" + cardQualityCapitalized).innerHTML -= number;
		
		document.getElementById("totalMissing" + rarityCapitalized + cardQualityCapitalized).innerHTML -= number;
		document.getElementById("totalMissingTotal" + cardQualityCapitalized).innerHTML -= number;
	}
	
	function updateMissingDustView(rarity) {
		var rarityCapitalized = capitalizeFirstLetter(rarity);
		var cardQualityCapitalized = capitalizeFirstLetter(selectedCardQuality);
		
		var td = document.getElementById("classMissingDust" + rarityCapitalized);
		var td2 = document.getElementById("classMissingDustTotal");
		
		if (settings.excludeGoldenCards) {
		    td.innerHTML = addThousandSeparator(missingDust.classes[selectedClass][rarity][0]);
			td2.innerHTML = addThousandSeparator(missingDust.classes[selectedClass].total[0]);
		}
		else {
		    td.innerHTML = addThousandSeparator(missingDust.classes[selectedClass][rarity][0] + missingDust.classes[selectedClass][rarity][1]);
			td2.innerHTML = addThousandSeparator(missingDust.classes[selectedClass].total[0] + missingDust.classes[selectedClass].total[1]);
		}
		
		td = document.getElementById("totalMissingDust" + rarityCapitalized);
		td2 = document.getElementById("totalMissingDustTotal");
		
		if (settings.excludeGoldenCards) {
		    td.innerHTML = addThousandSeparator(missingDust.total[rarity][0]);
			td2.innerHTML = addThousandSeparator(missingDust.total.total[0]);
		}
		else {
			td.innerHTML = addThousandSeparator(missingDust.total[rarity][0] + missingDust.total[rarity][1]);
			td2.innerHTML = addThousandSeparator(missingDust.total.total[0] + missingDust.total.total[1]);
		}
	}
	
	function displayClassTabs() {
		var div = document.getElementById("classTabs");
		var list = document.createElement("ul");
		var attrClass = document.getElementById("classTabsBar").getAttribute("class");
		document.getElementById("classTabsBar").setAttribute("class", attrClass + " " + selectedClass);
		
		for (var className in classes) {
			var listItem = document.createElement("li");
			listItem.setAttribute("class", "col-xs-10ths nopadding");
			var listItemLink = document.createElement("a");
			var span = document.createElement("span");
			span.innerHTML = classes[className].level;
				
			//span.setAttribute("contenteditable", true);
			/* BECAUSE EVENT LISTENERS NO WORKY ON THIS SPAN.
			   USE FORM INSTEAD? */
			span.setAttribute("onkeypress", "return handleKey(this, event)");
			span.setAttribute("onblur", "lol(this)");
			span.setAttribute("onpaste", "return false");
			span.setAttribute("ondrop", "return false");
			/* --------------------------------------------- */
			listItemLink.appendChild(span);
			
			if (className === "neutral")
				listItemLink.innerHTML = className;
			else {
				listItemLink.innerHTML = className + "<br>(" + listItemLink.innerHTML;
				listItemLink.innerHTML += ")";
			}
			
			(function (className) {
				listItemLink.addEventListener("click", function() {
					document.getElementById("classTabsBar").setAttribute("class", attrClass + " " + className);
					selectedClass = className;
					displayCards(className);
					displayMissingCards();
					displayMissingDust();
				});
			}(className))
			
			listItemLink.setAttribute("class", className + " " + "noselect");
				
			listItem.appendChild(listItemLink);
			list.appendChild(listItem);
		}
		div.appendChild(list);
		
		var filterList = document.getElementById("filtersLeft").getElementsByTagName("a");
		for (var i = 0; i < filterList.length; i++) {
			var filterListItem = filterList[i];
			if (filter === filterListItem.innerHTML.toLowerCase())
				filterListItem.setAttribute("class", "selected");
	        (function (filterListItem) {				
			    filterListItem.addEventListener("click", function() {
					filter = filterListItem.innerHTML.toLowerCase();
					var c = document.getElementById("classTabsBar").getElementsByTagName("a");
					for (var i = 0; i < c.length; i++)
                      c[i].removeAttribute("class");
				    filterListItem.setAttribute("class", "selected");
					displayCards(selectedClass);
					
					var filterListRight = document.getElementById("filtersRight").getElementsByTagName("a")[0];
		            if (settings.showOnlyMissingCards)
			            filterListRight.setAttribute("class", "selected");
					});
			}(filterListItem))
		}
		
		var filterListRight = document.getElementById("filtersRight").getElementsByTagName("a")[0];
		if (settings.showOnlyMissingCards)
			filterListRight.setAttribute("class", "selected");
		
	    filterListRight.addEventListener("click", function() {
			settings.showOnlyMissingCards = !settings.showOnlyMissingCards;
			localStorage.setItem("settings", JSON.stringify(settings));
			
			if (settings.showOnlyMissingCards)
			    filterListRight.setAttribute("class", "selected");
			else filterListRight.removeAttribute("class");
			displayCards(selectedClass);
			});
	}
	
	function displayCards(className) {
		var cardList = classes[className].cards;
			
		for (var className in raritiesEnum) {
			var list = document.getElementById("list_" + className);
			while (list.firstChild) {
				list.removeChild(list.firstChild);
			}
			// TEMPORARY TO MAKE LISTS FIXED WIDTH WHEN EMPTY
			//list.innerHTML="&nbsp";
		}
		
		for (var rarity in cardList) {
			var list = document.getElementById("list_" + rarity);
			
			var li = document.createElement("li");
			var link = document.createElement("a");
			link.textContent = "Apply to all";
			link.setAttribute("class", "buttonAll");
			link.addEventListener("click", function() { addAll(this); });
			link.addEventListener("contextmenu", function() { removeAll(this); });
			li.appendChild(link);
			list.appendChild(li);
			
			for (var name in cardList[rarity]) {
				var card = cardList[rarity][name];
				if (filter === "all" || card.set === filter) {
					if (!settings.showOnlyMissingCards || 
					(settings.showOnlyMissingCards && 
					(!settings.excludeGoldenCards && (card.normal < getCardCopies(card.rarity) || card.golden < getCardCopies(card.rarity))) ||
					(settings.excludeGoldenCards && (card.normal < getCardCopies(card.rarity)))
					)) {
				        var listItem = document.createElement("li");
				        var listItemLink = document.createElement("a");
				        listItemLink.textContent = name;
				        (function (card) {
					        listItemLink.addEventListener("click", function() { addCard(this, card); });
					        listItemLink.addEventListener("contextmenu", function() { removeCard(this, card); });
					        }(card))
				        listItemLink.setAttribute("class", "normal" + cardList[rarity][name].normal + " " + "golden" + cardList[rarity][name].golden + " " + "noselect");
			
				        listItem.appendChild(listItemLink);
				        list.appendChild(listItem);
					}
				}
			}
		}
	}
	
	function displayMissingCards() {
		document.getElementById("missingCardsClassTitle").innerHTML = selectedClass.toUpperCase();
		
		var missing = {
			free: [0, 0],
			common: [0, 0],
			rare: [0, 0],
			epic: [0, 0],
			legendary: [0, 0],
			total: [0, 0]
		};
		
		for (var set in missingCards.classes[selectedClass]) {
			if (set === "total")
				missing[set] = missingCards.classes[set];
			else {
			    for (var rarity in missingCards.classes[selectedClass][set]) {
				    missing[rarity][0] += missingCards.classes[selectedClass][set][rarity][0];
				    missing[rarity][1] += missingCards.classes[selectedClass][set][rarity][1];
			    }
			}
		}
		
		for (var rarity in missing) {
			var rarityCapitalized = rarity.charAt(0).toUpperCase() + rarity.slice(1);
			var td = document.getElementById("classMissing" + rarityCapitalized + "Normal");
			var normal = missing[rarity][0];
			td.innerHTML = normal;
			td = document.getElementById("classMissing" + rarityCapitalized + "Golden");
			if (settings.excludeGoldenCards)
			    td.innerHTML = "";
			else td.innerHTML = missing[rarity][1];
		}
	}
	
	function displayMissingCardsTotal() {
		var missing = {
			free: [0, 0],
			common: [0, 0],
			rare: [0, 0],
			epic: [0, 0],
			legendary: [0, 0],
			total: [0, 0]
		};
		
		for (var set in missingCards.total) {
			if (set === "total")
				missing[set] = missingCards.total[set];
			else {
			    for (var rarity in missingCards.total[set]) {
				    missing[rarity][0] += missingCards.total[set][rarity][0];
				    missing[rarity][1] += missingCards.total[set][rarity][1];
			    }
			}
		}
		
		for (var rarity in missing) {
			var rarityCapitalized = rarity.charAt(0).toUpperCase() + rarity.slice(1);
			var td = document.getElementById("totalMissing" + rarityCapitalized + "Normal");
			var normal = missing[rarity][0];
			td.innerHTML = normal;
			td = document.getElementById("totalMissing" + rarityCapitalized + "Golden");
			if (settings.excludeGoldenCards)
			    td.innerHTML = "";
			else td.innerHTML = missing[rarity][1];
		}
	}
	
	function displayMissingDust() {
		for (var rarity in missingDust.classes[selectedClass]) {
			var rarityCapitalized = rarity.charAt(0).toUpperCase() + rarity.slice(1);
			var td = document.getElementById("classMissingDust" + rarityCapitalized);
			var dust = 0;
			if (settings.excludeGoldenCards)
				dust = missingDust.classes[selectedClass][rarity][0];
			else dust = missingDust.classes[selectedClass][rarity][0] + missingDust.classes[selectedClass][rarity][1];
			td.innerHTML = dust.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
		}
	}
	
	function displayMissingDustTotal() {
		for (var rarity in missingDust.total) {
			var rarityCapitalized = rarity.charAt(0).toUpperCase() + rarity.slice(1);
			var td = document.getElementById("totalMissingDust" + rarityCapitalized);
			var dust = 0;
			if (settings.excludeGoldenCards)
				dust = missingDust.total[rarity][0];
			else dust = missingDust.total[rarity][0] + missingDust.total[rarity][1];
			td.innerHTML = dust.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
		}
	}	
	/*********************************************************
	**************************INIT****************************
	*********************************************************/
	function initializeClasses() {
		for (var className in classesEnum)
			classes[className] = new classHS(className);
	}
	
	function initializeMissingCards() {
		missingCards.classes = {};
		for (var classHS in classesEnum) {
			missingCards.classes[classHS] = {};
			for (var set in setsEnum)
		        missingCards.classes[classHS][set] = {
			        free: [0, 0],
			        common: [0, 0],
			        rare: [0, 0],
			        epic: [0, 0],
			        legendary: [0, 0],
			        total: [0, 0]
		        };
		}
		missingCards.total = {};
		for (var set in setsEnum) {			
		    missingCards.total[set] = {
			    free: [0, 0],
			    common: [0, 0],
			    rare: [0, 0],
			    epic: [0, 0],
			    legendary: [0, 0],
			    total: [0, 0]
		    };
		}
		
		missingCards.total.total = [0, 0];
	}
	
	function initializeMissingDust() {
		missingDust.classes = {};
		for (var classHS in classesEnum)
		    missingDust.classes[classHS] = {
			    free: [0, 0],
			    common: [0, 0],
			    rare: [0, 0],
			    epic: [0, 0],
			    legendary: [0, 0],
			    total: [0, 0]
		    };
		missingDust.total = {
			free: [0, 0],
			common: [0, 0],
			rare: [0, 0],
			epic: [0, 0],
			legendary: [0, 0],
			total: [0, 0]
		}
	}

	function initSelectedCardQuality() {		
		var selectedQualityNormal = document.getElementById("selectedQualityNormal");
		var selectedQualityGolden = document.getElementById("selectedQualityGolden");
		
		selectedQualityNormal.addEventListener("click", function() { setSelectedCardQuality(this); });
		selectedQualityGolden.addEventListener("click", function() { setSelectedCardQuality(this); });
    }

    function setSelectedCardQuality(element) {
		if (element.getAttribute("id") === "selectedQualityNormal")
			document.getElementById("selectedQualityGolden").removeAttribute("class");
		else document.getElementById("selectedQualityNormal").removeAttribute("class");
		
		selectedCardQuality = element.innerHTML.toLowerCase();
		element.setAttribute("class", "selected");
    }
	
	function loadLocalStorage() {
		classes = JSON.parse(localStorage.getItem('classes'));
		missingCards = JSON.parse(localStorage.getItem("missingCards"));
		missingDust = JSON.parse(localStorage.getItem("missingDust"));
		currentDust = parseInt(localStorage.getItem("currentDust"));
		disenchantedDust = parseInt(localStorage.getItem("disenchantedDust"));
		if (localStorage.getItem("settings") !== null)
		    settings = JSON.parse(localStorage.getItem("settings"));
	}
	
	function displayProgress() {
		var template = document.getElementById("template-progress");
		document.getElementById("containerRow").innerHTML = template.innerHTML;
		
		document.getElementById("header-center").style.visibility = "hidden";
		
		document.oncontextmenu = function() {
            return true;
        }
		
		document.getElementById('select').addEventListener('change', displayProgressTable);
		
	//	for (set in setsEnum)
	//	    buildProgressTable(set);
	}
	
	function displayProgressTable(evt) {
		document.getElementById("containerRow").childNodes[1].removeChild(
		    document.getElementById("containerRow").childNodes[1].lastChild);		
		buildProgressTable(evt.target.value);
	}
	
	function buildProgressTable(set) {
		var table = document.createElement("table");
		table.setAttribute("id", "progressTable");
		var tr = document.createElement("tr");
		var td = document.createElement("th");
		
		//console.log(missingCards.total[set].total);
		
		td.innerHTML = set.toUpperCase();
		td.setAttribute("colspan", 9);
		tr.appendChild(td);
		table.appendChild(tr);
		
		tr = document.createElement("tr");
		tr.appendChild(document.createElement("td"));
		for (rarity in setsEnum[set]) {
		    td = document.createElement("td");
		    td.innerHTML = capitalizeFirstLetter(rarity);
		    tr.appendChild(td);
		    tr.appendChild(document.createElement("td"));
		}
		table.appendChild(tr);
		
		document.getElementById("containerRow").childNodes[1].appendChild(table);
		
		for (classHS in classesEnum) {
			table.appendChild(buildProgressTableRow("normal", set, classHS));
			if (!settings.excludeGoldenCards)
			    table.appendChild(buildProgressTableRow("golden", set, classHS));
		}
		table.appendChild(buildProgressTableRow("normal", set, "total"));
		if (!settings.excludeGoldenCards)
		    table.appendChild(buildProgressTableRow("golden", set, "total"));
	}
	
	function buildProgressTableRow(quality, set, classHS) {
		var tr = document.createElement("tr");
		tr.setAttribute("class", quality);
		td = document.createElement("td");
		
		var i;
		if (quality == "normal") {
			i = 0;
		    td.innerHTML = capitalizeFirstLetter(classHS);
		}
		else {
			i = 1;
		}
		tr.appendChild(td);

		for (rarity in setsEnum[set]) {
		    var td = document.createElement("td");
			var text;
			var total;
			
			if (classHS == "neutral")
			    total = setsEnum[set][rarity].neutral;
			else if (classHS == "total")
				total = setsEnum[set][rarity].total;
			else if (set == "tgt" && classHS == "hunter" && rarity == "legendary")
				total = setsEnum[set][rarity].hunter;
			else total = setsEnum[set][rarity].other;
			
			total == undefined ? total = 0 : total = total;
			
			if (total == 0) {
				text = "-";
			}
			else {
				var missing;
				if (classHS != "total")
			        missing = missingCards.classes[classHS][set][rarity][i];
				else missing = missingCards.total[set][rarity][i];
				text = total - missing + "/" + total +
				   	   " (" + Math.round(((total - missing) / total) * 100) + "%)";
			}
			
		    td.innerHTML = text;
			tr.appendChild(td);
			td = document.createElement("td");
			
			if ((quality == "normal" && setsSoulbound[set] == "normal" || setsSoulbound[set] == "both") ||
			    (quality == "golden" && setsSoulbound[set] == "golden" || setsSoulbound[set] == "both")) {
					text = "-";
				}
			else if (total != 0) {
			    var totalDust = total * craftingCosts[rarity][i];
			    var currDust = (total - missing) * craftingCosts[rarity][i];
			    text = " " + currDust + "/" + totalDust;
			}
			td.innerHTML = text;
			tr.appendChild(td);
		}
		return tr;
	}
	
	function displayAbout() {
		var template = document.getElementById("template-about").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
		
		document.getElementById("header-center").style.visibility = "hidden";
		
		document.oncontextmenu = function() {
            return true;
        }
	}

	function displayNews() {
		var template = document.getElementById("template-news").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
		
	    var news = document.getElementById("link-news");
		news.className = news.className.replace(" news", "");
		
		document.getElementById("header-center").style.visibility = "hidden";
		
		document.oncontextmenu = function() {
            return true;
        }
	}
	
	function displayPacks() {
		var template = document.getElementById("template-packs").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
		
		updatePackGuide();
		
		document.getElementById("header-center").style.visibility = "hidden";
		
		document.oncontextmenu = function() {
            return true;
        }
	}
	
	function updatePackGuide() {		
		var averageValue = 0;
		for (set in packsEnum) {
		    for (rarity in raritiesEnum) {
			    if (rarity !== "free") {
		            averageValue += chanceOfGetting[rarity][0] * (((setsEnum[set][rarity].total - missingCards.total[set][rarity][0]) / setsEnum[set][rarity].total) * disenchantmentValue[rarity][0]
		                + (missingCards.total[set][rarity][0] / setsEnum[set][rarity].total) * craftingCosts[rarity][0]);
					if (!settings.excludeGoldenCards)
					    averageValue += chanceOfGetting[rarity][1] * (((setsEnum[set][rarity].total - missingCards.total[set][rarity][1]) / setsEnum[set][rarity].total) * disenchantmentValue[rarity][1]
		                    + (missingCards.total[set][rarity][1] / setsEnum[set][rarity].total) * craftingCosts[rarity][1]);
					else averageValue += chanceOfGetting[rarity][1] * disenchantmentValue[rarity][1];
				}
		    }
		
		    document.getElementById(set + "AverageValue").innerHTML = (averageValue * 5).toFixed(1);
			averageValue = 0;
		}
	}	
	
	function displayTracker() {
		var template = document.getElementById("template-tracker").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
		
		displayClassTabs();
		displayCards(selectedClass);
		displayMissingCards();
		displayMissingCardsTotal();
		displayMissingDust();
		displayMissingDustTotal();
		
		document.getElementById("checkboxGolden").checked = settings.excludeGoldenCards;
		
		document.getElementById("header-center").style.visibility = "visible";
		
		document.oncontextmenu = function() {
            return false;
        }
	}

	function loadCollection(collection) {
		console.log("BACKING UP");
		for (var className in collection) {
			// level
			for (var rarity in collection[className].cards) {
				for (var cardName in collection[className].cards[rarity]) {
					var card = collection[className].cards[rarity][cardName];
					if (classes[className].cards[rarity][cardName] !== undefined) {
						classes[className].cards[rarity][cardName].normal = card.normal;
						classes[className].cards[rarity][cardName].golden = card.golden;
						
						updateNormalCard(card, card.normal);
						updateGoldenCard(card, card.golden);
					}
				}
			}
		}
	}
		
	function importCollection(event) {
	    var files = event.target.files; // FileList object

        var f = files[0];
        // Only process JSON files.
        if (!f.name.match(/[^\\]*\.(json)$/i)) {
			alert("Not a JSON file.");
            return;
        }		

        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function(event) {
	        try {
			    var collection = JSON.parse(event.target.result);
				initializeCollection();
			    loadCollection(collection);
				updateLocalStorage();
				displayTracker();
		    }
		    catch(e) {
				if (e instanceof SyntaxError) {
					alert("Invalid JSON file.");
				}
				else if (e instanceof TypeError) {
			        alert("Invalid HSCT file");
				}
				else alert(e);
				return;
		    }
        });

        // Read in the JSON file as text.
		reader.readAsText(f);
	}
	
	function exportCollection() {
		// Check for File API support.
        if (window.Blob) {
		    var blob = new Blob([JSON.stringify(classes)], { type: "text/plain;charset=utf-8;"} );
            saveAs(blob, "HSCT.json");
		} else {
            alert('Exporting is not supported in this browser.');
        }
	}
	
	function initializeCollection() {
		initializeMissingDust();
		initializeMissingCards();
		initializeClasses();
				
		for (set in setsEnum)
		    importCards(set);
				
		for (var className in classes)
			sortCards(className);		
	}
	
	return {
		init: function() {
		//	console.log(JSON.stringify(localStorage).length);

			if (typeof(Storage) !== "undefined") {
				var storedVersion = localStorage.getItem("version");
				
				if (storedVersion != version) {
					initializeCollection()
					
					if (parseFloat(storedVersion) < parseFloat(version)) {
						var storedCollection = JSON.parse(localStorage.getItem('classes'));
						loadCollection(storedCollection);
						var storedSettings = JSON.parse(localStorage.getItem('settings'));
						for (var setting in storedSettings)
						    settings[setting] = storedSettings[setting];
						
						var news = document.getElementById("link-news");
						news.className = news.className + " news";
					}

				    updateLocalStorage();
					localStorage.setItem("currentDust", currentDust);
					localStorage.setItem("disenchantedDust", disenchantedDust);
					localStorage.setItem("version", version);
				}
				else {					
				    loadLocalStorage();
				}
			}
						
			initSelectedCardQuality();
			document.getElementById("link-tracker").addEventListener("click", displayTracker);
			document.getElementById("link-progress").addEventListener("click", displayProgress);
			document.getElementById("link-packs").addEventListener("click", displayPacks);
			document.getElementById("link-news").addEventListener("click", displayNews);
			document.getElementById("link-about").addEventListener("click", displayAbout);			
			document.getElementById('link-export').addEventListener('click', exportCollection);
			document.getElementById('link-import').addEventListener('click', function() {
		        // Check for File API support.
                if (window.File && window.FileReader && window.FileList) {
			        var elem = document.getElementById("files");
					elem.value = "";
			        var event = new MouseEvent('click', {
			            'view': window,
			            'bubbles': true,
			            'cancelable': true
			        });            
                    elem.dispatchEvent(event);			
			    } else {
                    alert('Importing is not supported in this browser.');
                }
		    });
			
		    document.getElementById('files').addEventListener('change', importCollection);
			
			displayTracker();
		},
		
		toggleGoldenCards: function() {
		    settings.excludeGoldenCards = !settings.excludeGoldenCards;
		    localStorage.setItem("settings", JSON.stringify(settings));
			displayMissingDust();
			displayMissingDustTotal();
			displayMissingCards();
			displayMissingCardsTotal();
			displayCards(selectedClass);
	    }
	};
})();

window.onload = HSCollectionTracker.init();

//alert(Object.keys(classEnum).length);

	/*function handleKey(element, event) {
	  var a = String.fromCharCode(event.keyCode);
	  console.log(a); 
	  console.log(element.parentNode.innerText.split(" ")[0]);
	  if (/\d/.test(a)) {
		  if (window.getSelection().type == "Range")
			  if (element.innerHTML.length <= 2)
				  return true;
			  else return false;
		  
		  else if (element.innerHTML.length + 1 <= 2)
			return true;
		}
	  return false;
	}*/
	
   /*function lol(e) {
	   window.getSelection().removeAllRanges();
	   document.selection.empty();
	   console.log(e);
		//e.innerHTML = "lol";
	}*/
	
	/*$('span[contenteditable]').keydown(function(e) {
		// trap the return key being pressed
		if (e.keyCode === 13) {
		  // insert 2 br tags (if only one br tag is inserted the cursor won't go to the next line)
		  //document.execCommand('insertHTML', false, '<br><br>');
		  document.getElementById("a").blur();
		  // prevent the default behaviour of return key pressed
		  return false;
		}
	  });*/