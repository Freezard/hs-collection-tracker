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
	
	// Properties = the number of cards in each set.
	// Hardcoded, should be built dynamically
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
				other: 0,
				total: 2
			},
			legendary: {
				neutral: 1,
				other: 0,
				total: 1
			}
		},
		promo: {
			legendary: {
				neutral: 2,
				other: 0,
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
				other: 0,
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
		},
		loe: {
		    common: {
				neutral: 14,
				other: 4,
				total: 50
			},
			rare: {
				neutral: 8,
				other: 2,
				total: 26
			},
			epic: {
				neutral: 4,
				other: 0,
				total: 4
			},
			legendary: {
				neutral: 5,
				other: 0,
				total: 5
			}
		}		
	};
	
	// Lists which card qualities are uncraftable for each set
	var setsSoulbound = {
		basic: "both",
		classic: "none",
		reward: "both",
		promo: "golden",
		naxxramas: "normal",
		gvg: "none",
		blackrock: "normal",
		tgt: "none",
		loe: "normal"
	};
	
	var packsEnum = {
		classic: "classic",
		gvg: "gvg",
		tgt: "tgt"
	};
	
	var craftingCost = {
		free:      { normal: 0, golden: 0 },
		common:    { normal: 40, golden: 400 },
		rare:      { normal: 100, golden: 800 },
		epic:      { normal: 400, golden: 1600 },
		legendary: { normal: 1600, golden: 3200 }
	};
	
	var disenchantmentValue = {
		free:      { normal: 0, golden: 0 },
		common:    { normal: 5, golden: 50 },
		rare:      { normal: 20, golden: 100 },
		epic:      { normal: 100, golden: 400 },
		legendary: { normal: 400, golden: 1600 }
	};
	
	// Chance of getting a card of a specific quality when opening packs.
	// For each card, not in total
	var chanceOfGetting = {
		free:      { normal: 0, golden: 0 },
		common:    { normal: 0.7, golden: 0.0147 },
		rare:      { normal: 0.214, golden: 0.0137 },
		epic:      { normal: 0.0428, golden: 0.003 },
		legendary: { normal: 0.0108, golden: 0.001 }
	};

	// Keeps track of how many cards and how much dust is missing
	var missingCards = {};
	var missingDust = {};

	// The collection of cards, divided by classes
	var classes = {};
	
	// Class and card quality currently selected in the tracker
	var selectedClass = "neutral";
	var selectedCardQuality = "normal";
	
	// Persistent settings
	var settings = {
		excludeGoldenCards: false,
		showOnlyMissingCards: false
	};
	
	var filterBySet = "all";
	
	// Currently unused
	var currentDust = 0;
	var disenchantedDust = 0;
	
	var version = 1.142;
	
	// Card object
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
		this.isCraftable = function(quality) {
			return this.soulbound !== "both" && this.soulbound !== quality;
		}
		this.getCraftingCost = function(quality) {
			return craftingCost[this.rarity][quality];
		}
		
	}
	
	// Class object
	function classHS(name) {
		this.name = name;
		this.level = 1; // Currently unused
		this.cards = {
			free: {},
			common: {},
			rare: {},
			epic: {},
			legendary: {}
		};
		// Adds a card to this class
		this.addCard = function(card) {
			var rarity = card.rarity, set = card.set;
			var cardCopies = getCardCopies(rarity);
			this.cards[rarity][card.name] = card;
			
			for (var i = 0, quality = "normal"; i < 2; i++, quality = "golden") {
				missingCards.classes[name][set][rarity][quality] += cardCopies;
				missingCards.classes[name][set].total[quality] += cardCopies;
				missingCards.classes[name].total[rarity][quality] += cardCopies;
				missingCards.classes[name].total.total[quality] += cardCopies;
			
				missingCards.total[set][rarity][quality] += cardCopies;
				missingCards.total[set].total[quality] += cardCopies;
				missingCards.total.total[rarity][quality] += cardCopies;
				missingCards.total.total.total[quality] += cardCopies;
				
				if (card.isCraftable(quality)) {
					var craftingCost = card.getCraftingCost(quality) * cardCopies;
					
					missingDust.classes[name][set][rarity][quality] += craftingCost;
					missingDust.classes[name][set].total[quality] += craftingCost;
					missingDust.classes[name].total[rarity][quality] += craftingCost;
					missingDust.classes[name].total.total[quality] += craftingCost;
					
					missingDust.total[set][rarity][quality] += craftingCost;
					missingDust.total[set].total[quality] += craftingCost;
					missingDust.total.total[rarity][quality] += craftingCost;
					missingDust.total.total.total[quality] += craftingCost;
				}
			}
		}
	}
	/*********************************************************
	**************************UTILS***************************
	*********************************************************/	
	// Reads a text file and returns the content
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
	
	function capitalizeFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}
	
	function addThousandSeparator(number) {
		return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	}
	
	function getMissingDataObject() {
		return {
				free:      { normal: 0, golden: 0 },
				common:    { normal: 0, golden: 0 },
				rare:      { normal: 0, golden: 0 },
				epic:      { normal: 0, golden: 0 },
				legendary: { normal: 0, golden: 0 },
				total:     { normal: 0, golden: 0 }
			};
	}	
	/*********************************************************
	**********************CARD FUNCTIONS**********************
	*********************************************************/
	// Imports cards from the given set name to the collection.
	// Card data is stored in text files
	function importCards(set) {
		var cardData = readTextFile(set + ".txt");
		cardData = cardData.replace(/(\r)/gm, "");
		var cardLines = cardData.split("\n");
		var cardClass;
		for (var i = 0; i < cardLines.length; i++) {
			var cardLine = cardLines[i].split(",");
			
			if (cardLine.length == 1 && cardLine != "")
				cardClass = cardLine[0];			
			else if (cardLine != "")
				classes[cardClass].addCard(new card(cardLine[0], cardLine[1], cardLine[2],
				cardLine[3], cardClass, set, setsSoulbound[set]));
		}
	}	
	
	// Sorts all the card lists for the specified class.
	// Sorting order:
	// Mana cost: Lower > higher
	// Type: Weapon > spell > minion
	// Name: Lexicographical order
	function sortCards(className) {
		var cardList = classes[className].cards;
		
		for (var rarity in cardList) {
			var sortedArray = [];
			for (var name in cardList[rarity])
				sortedArray.push([name, cardList[rarity][name]]);
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
	
	function updateCard(card, quality, number) {
		card[selectedCardQuality] += number;
		
		missingCards.classes[card.className][card.set][card.rarity][quality] -= number;
		missingCards.classes[card.className][card.set].total[quality] -= number;
		missingCards.classes[card.className].total[card.rarity][quality] -= number;
		missingCards.classes[card.className].total.total[quality] -= number;
		
		missingCards.total[card.set][card.rarity][quality] -= number;
		missingCards.total[card.set].total[quality] -= number;
		missingCards.total.total[card.rarity][quality] -= number;
		missingCards.total.total.total[quality] -= number;
		
		if (card.soulbound !== "both" && card.soulbound !== quality) {
		    var cost = craftingCost[card.rarity][quality];
		
		    updateMissingDust(card, cost * number, quality);
		}
	}
	
	function updateMissingDust(card, craftingCost, cardQuality) {		
		if (cardQuality === "normal") {
			missingDust.classes[card.className][card.set][card.rarity].normal -= craftingCost;
		    missingDust.classes[card.className][card.set].total.normal -= craftingCost;
			missingDust.classes[card.className].total[card.rarity].normal -= craftingCost;
			missingDust.classes[card.className].total.total.normal -= craftingCost;
			
		    missingDust.total[card.set][card.rarity].normal -= craftingCost;
			missingDust.total[card.set].total.normal -= craftingCost;
			missingDust.total.total[card.rarity].normal -= craftingCost;
		    missingDust.total.total.total.normal -= craftingCost;
		}
		else if (cardQuality === "golden") {
			missingDust.classes[card.className][card.set][card.rarity].golden -= craftingCost;
		    missingDust.classes[card.className][card.set].total.golden -= craftingCost;
			missingDust.classes[card.className].total[card.rarity].golden -= craftingCost;
			missingDust.classes[card.className].total.total.golden -= craftingCost;
			
		    missingDust.total[card.set][card.rarity].golden -= craftingCost;
			missingDust.total[card.set].total.golden -= craftingCost;
		    missingDust.total.total[card.rarity].golden -= craftingCost;
			missingDust.total.total.total.golden -= craftingCost;
		}
	}
	
	// Adds a card through clicking on an <li><a> element
	function addCard(element, card) {
		if (card[selectedCardQuality] < getCardCopies(card.rarity)) {
			updateCard(card, selectedCardQuality, 1);
			
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
			    updateCard(card, selectedCardQuality, cardCopies - card[selectedCardQuality]);
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
			    updateCard(card, selectedCardQuality, -card[selectedCardQuality]);
		}
		
		updateLocalStorage();
		displayTracker();
	}
	
	function removeCard(element, card) {
		if (card[selectedCardQuality] > 0) {
		    updateCard(card, selectedCardQuality, -1);
		
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
		    td.innerHTML = addThousandSeparator(missingDust.classes[selectedClass].total[rarity].normal);
			td2.innerHTML = addThousandSeparator(missingDust.classes[selectedClass].total.total.normal);
		}
		else {
		    td.innerHTML = addThousandSeparator(missingDust.classes[selectedClass].total[rarity].normal + missingDust.classes[selectedClass].total[rarity].golden);
			td2.innerHTML = addThousandSeparator(missingDust.classes[selectedClass].total.total.normal + missingDust.classes[selectedClass].total.total.golden);
		}
		
		td = document.getElementById("totalMissingDust" + rarityCapitalized);
		td2 = document.getElementById("totalMissingDustTotal");
		
		if (settings.excludeGoldenCards) {
		    td.innerHTML = addThousandSeparator(missingDust.total.total[rarity].normal);
			td2.innerHTML = addThousandSeparator(missingDust.total.total.total.normal);
		}
		else {
			td.innerHTML = addThousandSeparator(missingDust.total.total[rarity].normal + missingDust.total.total[rarity].golden);
			td2.innerHTML = addThousandSeparator(missingDust.total.total.total.normal + missingDust.total.total.total.golden);
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
			if (filterBySet === filterListItem.innerHTML.toLowerCase())
				filterListItem.setAttribute("class", "selected");
	        (function (filterListItem) {				
			    filterListItem.addEventListener("click", function() {
					filterBySet = filterListItem.innerHTML.toLowerCase();
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
				if (filterBySet === "all" || card.set === filterBySet) {
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
		
		var missing = getMissingDataObject();
		
		for (var set in missingCards.classes[selectedClass]) {
			if (set === "total")				
				missing[set] = missingCards.classes[selectedClass].total;
			else {
			    for (var rarity in missingCards.classes[selectedClass][set]) {
				    missing[rarity].normal += missingCards.classes[selectedClass][set][rarity].normal;
				    missing[rarity].golden += missingCards.classes[selectedClass][set][rarity].golden;
			    }
			}
		}
		
		for (var rarity in missing) {
			var rarityCapitalized = rarity.charAt(0).toUpperCase() + rarity.slice(1);
			var td = document.getElementById("classMissing" + rarityCapitalized + "Normal");
			var normal = missingCards.classes[selectedClass].total[rarity].normal;
			td.innerHTML = normal;
			td = document.getElementById("classMissing" + rarityCapitalized + "Golden");
			if (settings.excludeGoldenCards)
			    td.innerHTML = "";
			else td.innerHTML = missingCards.classes[selectedClass].total[rarity].golden;
		}
	}
	
	function displayMissingCardsTotal() {
		var missing = getMissingDataObject();
		
		for (var set in missingCards.total) {
			if (set === "total")
				missing[set] = missingCards.total[set];
			else {
			    for (var rarity in missingCards.total[set]) {
				    missing[rarity].normal += missingCards.total[set][rarity].normal;
				    missing[rarity].golden += missingCards.total[set][rarity].golden;
			    }
			}
		}
		
		for (var rarity in missing) {
			var rarityCapitalized = rarity.charAt(0).toUpperCase() + rarity.slice(1);
			var td = document.getElementById("totalMissing" + rarityCapitalized + "Normal");
			var normal = missingCards.total.total[rarity].normal;
			td.innerHTML = normal;
			td = document.getElementById("totalMissing" + rarityCapitalized + "Golden");
			if (settings.excludeGoldenCards)
			    td.innerHTML = "";
			else td.innerHTML = missingCards.total.total[rarity].golden;
		}
	}
	
	function displayMissingDust() {
		for (var rarity in missingDust.classes[selectedClass].total) {
			var rarityCapitalized = rarity.charAt(0).toUpperCase() + rarity.slice(1);
			var td = document.getElementById("classMissingDust" + rarityCapitalized);
			var dust = 0;
			if (settings.excludeGoldenCards)
				dust = missingDust.classes[selectedClass].total[rarity].normal;
			else dust = missingDust.classes[selectedClass].total[rarity].normal + missingDust.classes[selectedClass].total[rarity].golden;
			td.innerHTML = dust.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
		}
	}
	
	function displayMissingDustTotal() {
		for (var rarity in missingDust.total.total) {
			var rarityCapitalized = rarity.charAt(0).toUpperCase() + rarity.slice(1);
			var td = document.getElementById("totalMissingDust" + rarityCapitalized);
			var dust = 0;
			if (settings.excludeGoldenCards)
				dust = missingDust.total.total[rarity].normal;
			else dust = missingDust.total.total[rarity].normal + missingDust.total.total[rarity].golden;
			td.innerHTML = dust.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
		}
	}	
	/*********************************************************
	**************************INIT****************************
	*********************************************************/
	function initClasses() {
		for (var className in classesEnum)
			classes[className] = new classHS(className);
	}
	
	function initMissingData() {
		for (var i = 0, missingData = missingCards; i < 2; i++, missingData = missingDust) {
			missingData.classes = {};
			for (var className in classesEnum) {
				missingData.classes[className] = {};
				for (var set in setsEnum)
					missingData.classes[className][set] = getMissingDataObject();
				missingData.classes[className].total = getMissingDataObject();
			}
			missingData.total = {};
			for (var set in setsEnum) {
				missingData.total[set] = getMissingDataObject();
			}
			
			missingData.total.total = getMissingDataObject();
		}
	}

	function initSelectedCardQuality() {		
		var selectedQualityNormal = document.getElementById("selectedQualityNormal");
		var selectedQualityGolden = document.getElementById("selectedQualityGolden");
		
		selectedQualityNormal.addEventListener("click", function() { setSelectedCardQuality(this); });
		selectedQualityGolden.addEventListener("click", function() { setSelectedCardQuality(this); });
    }

	function initEventListeners() {
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
	/*********************************************************
	***********************PROGRESS PAGE**********************
	*********************************************************/
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
		td.setAttribute("colspan", 11);
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
		td = document.createElement("td");
		td.innerHTML = "All";
		tr.appendChild(td);
		tr.appendChild(document.createElement("td"));		
		
		table.appendChild(tr);
		
		document.getElementById("containerRow").childNodes[1].appendChild(table);
		
		for (className in classesEnum) {
			table.appendChild(buildProgressTableRow("normal", set, className));
			if (!settings.excludeGoldenCards)
			    table.appendChild(buildProgressTableRow("golden", set, className));
		}
		table.appendChild(buildProgressTableRow("normal", set, "total"));
		if (!settings.excludeGoldenCards)
		    table.appendChild(buildProgressTableRow("golden", set, "total"));
	}
	
	function buildProgressTableRow(quality, set, className) {
		var tr = document.createElement("tr");
		tr.setAttribute("class", quality);
		td = document.createElement("td");
		
		var i;
		if (quality == "normal") {
			i = "normal";
		    td.innerHTML = capitalizeFirstLetter(className);
		}
		else {
			i = "golden";
		}
		tr.appendChild(td);

		for (rarity in setsEnum[set]) {
		    var td = document.createElement("td");
			var text;
			var total;
			
			if (className == "neutral")
			    total = setsEnum[set][rarity].neutral;
			else if (className == "total")
				total = setsEnum[set][rarity].total;
			else if (set == "tgt" && className == "hunter" && rarity == "legendary")
				total = setsEnum[set][rarity].hunter;
			else total = setsEnum[set][rarity].other;
			
			total == undefined ? total = 0 : total = total;
			
			if (total == 0) {
				text = "-";
			}
			else {
				var missing;
				if (className != "total")
			        missing = missingCards.classes[className][set][rarity][i];
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
			    var totalDust = total * craftingCost[rarity][i];
			    var currDust = (total - missing) * craftingCost[rarity][i];
			    text = " " + currDust + "/" + totalDust;
			}
			td.innerHTML = text;
			tr.appendChild(td);
		}
		
		// All rarities combined
		var td = document.createElement("td");
		var text;
		var total = 0;
		
		if (className == "neutral")
			for (rarity in setsEnum[set])
				total += setsEnum[set][rarity].neutral;
		else if (className == "total")
			for (rarity in setsEnum[set])
				total += setsEnum[set][rarity].total;
		else if (set == "tgt" && className == "hunter" && rarity == "legendary")
			total = setsEnum[set][rarity].hunter;
		else for (rarity in setsEnum[set])
				total += setsEnum[set][rarity].other;
		
		if (isNaN(total) || total == undefined) total = 0;
		
		if (total == 0) {
			text = "-";
		}
		else {
			var missing;
			if (className != "total")
				missing = missingCards.classes[className][set].total[i];
			else missing = missingCards.total[set].total[i];
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
			var cl = className;
			if (cl != "neutral" && cl != "total")
				cl = "other";
				
			var totalDust = 0;
			for (rarity in setsEnum[set])
				totalDust += setsEnum[set][rarity][cl] * craftingCost[rarity][i];
			var currDust = 0;
			if (className != "total")
			    currDust = totalDust - missingDust.classes[className][set].total[i];
			else currDust = totalDust - missingDust.total[set].total[i];
			text = " " + currDust + "/" + totalDust +
				   " (" + Math.round((currDust / totalDust) * 100) + "%)";
		}
		td.innerHTML = text;
		tr.appendChild(td);
		
		return tr;
	}
	/*********************************************************
	**********************HTML TEMPLATES**********************
	*********************************************************/
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
		            averageValue += chanceOfGetting[rarity].normal * (((setsEnum[set][rarity].total - missingCards.total[set][rarity].normal) / setsEnum[set][rarity].total) * disenchantmentValue[rarity].normal
		                + (missingCards.total[set][rarity].normal / setsEnum[set][rarity].total) * craftingCost[rarity].normal);
					if (!settings.excludeGoldenCards)
					    averageValue += chanceOfGetting[rarity].golden * (((setsEnum[set][rarity].total - missingCards.total[set][rarity].golden) / setsEnum[set][rarity].total) * disenchantmentValue[rarity].golden
		                    + (missingCards.total[set][rarity].golden / setsEnum[set][rarity].total) * craftingCost[rarity].golden);
					else averageValue += chanceOfGetting[rarity].golden * disenchantmentValue[rarity].golden;
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
	/*********************************************************
	************************COLLECTION************************
	*********************************************************/
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
						
						updateCard(card, "normal", card.normal);
						updateCard(card, "golden", card.golden);
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
				initCollection();
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
	
	function initCollection() {
		initMissingData();
		initClasses();
				
		for (set in setsEnum)
		    importCards(set);
				
		for (var className in classes)
			sortCards(className);		
	}
	/*********************************************************
	***********************MAIN FUNCTION**********************
	*********************************************************/
	return {
		init: function() {
		//	console.log(JSON.stringify(localStorage).length);

			if (typeof(Storage) !== "undefined") {
				var storedVersion = localStorage.getItem("version");
				
				if (storedVersion != version) {
					initCollection()
					
					if (parseFloat(storedVersion) < parseFloat(version)) {
						var storedCollection = JSON.parse(localStorage.getItem('classes'));
						loadCollection(storedCollection);
						var storedSettings = JSON.parse(localStorage.getItem('settings'));
						for (var setting in storedSettings)
						    settings[setting] = storedSettings[setting];
						
						var news = document.getElementById("link-news");
						//news.className = news.className + " news";
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
			initEventListeners();
			
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
/*********************************************************
************************UNFINISHED************************
*********************************************************/
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