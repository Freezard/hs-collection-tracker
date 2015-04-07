/*  main.js
    Hearthstone Collection Tracker
*/
var HSCollectionTracker = (function() {
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
		basic: 133,
		classic: 245,
		reward: 2,
		promo: 2,
		naxxramas: 30,
		gvg: 123,
		blackrock: 31
	};
	
	var setsSoulbound = {
		basic: "both",
		classic: "none",
		reward: "both",
		promo: "golden",
		naxxramas: "normal",
		gvg: "none",
		blackrock: "normal"		
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
	var missingCardsTotal = {
			free: [0, 0],
			common: [0, 0],
			rare: [0, 0],
			epic: [0, 0],
			legendary: [0, 0],
			total: [0, 0]
	};
	
	var missingDustTotal = {
			free: 0,
			common: 0,
			rare: 0,
			epic: 0,
			legendary: 0,
			total: 0,
		};

	var classes = null;
	var selectedClass = "neutral";
	var selectedCardQuality = "normal";
	var currentDust = 0;
	var disenchantedDust = 0;
	var version = 0.3;
	
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
		this.missingCards = {
			free: [0, 0],
			common: [0, 0],
			rare: [0, 0],
			epic: [0, 0],
			legendary: [0, 0],
			total: [0, 0],
		};
		this.missingDust = {
			free: 0,
			common: 0,
			rare: 0,
			epic: 0,
			legendary: 0,
			total: 0,
		};
		this.addCard = function(card) {
			this.cards[card.rarity][card.name] = card;
			var cardCopies = getCardCopies(card);
			
			this.missingCards[card.rarity][0] += cardCopies;
			this.missingCards[card.rarity][1] += cardCopies;
			this.missingCards.total[0] += cardCopies;
			this.missingCards.total[1] += cardCopies;
			
			missingCardsTotal[card.rarity][0] += cardCopies;
			missingCardsTotal[card.rarity][1] += cardCopies;
			missingCardsTotal.total[0] += cardCopies;
			missingCardsTotal.total[1] += cardCopies;		
			
			if (card.soulbound === "none" || card.soulbound === "normal") {
				var craftingCostGolden = craftingCosts[card.rarity][1] * cardCopies;
				
				this.missingDust[card.rarity] += craftingCostGolden;
				this.missingDust.total += craftingCostGolden;
				
				missingDustTotal[card.rarity] += craftingCostGolden;
				missingDustTotal.total += craftingCostGolden;
			}
			if (card.soulbound === "none" || card.soulbound === "golden") {
				var craftingCostNormal = craftingCosts[card.rarity][0] * cardCopies;
				
				this.missingDust[card.rarity] += craftingCostNormal;
				this.missingDust.total += craftingCostNormal;
				
				missingDustTotal[card.rarity] += craftingCostNormal;
				missingDustTotal.total += craftingCostNormal;
			}
		}
	}

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
				a[1].type === "spell" ? -1 :
				1 :	a[1].mana - b[1].mana
				});
			
			var sortedList = {};
			for (var i = 0; i < sortedArray.length; ++i)
				if (sortedArray[i] !== undefined)
					sortedList[sortedArray[i][0]] = sortedArray[i][1];
		
			cardList[rarity] = sortedList;
		}
	}
	
	function updateNormalCard(card, number) {
		classes[card.className].missingCards[card.rarity][0] -= number;
		classes[card.className].missingCards.total[0] -= number;
		missingCardsTotal[card.rarity][0] -= number;
		missingCardsTotal.total[0] -= number;
		
		if (card.soulbound === "none" || card.soulbound === "golden") {
		    var craftingCost = craftingCosts[card.rarity][0] ;
		
		    updateMissingDust(card, craftingCost * number);
		}
	}
	
	function updateGoldenCard(card, number) {
		classes[card.className].missingCards[card.rarity][1] -= number;
		classes[card.className].missingCards.total[1] -= number;
		missingCardsTotal[card.rarity][1] -= number;
		missingCardsTotal.total[1] -= number;
		
		if (card.soulbound === "none" || card.soulbound === "normal") {
		    var craftingCost = craftingCosts[card.rarity][1];
		
		    updateMissingDust(card, craftingCost * number);
		}
	}
	
	function updateMissingDust(card, craftingCost) {
		classes[card.className].missingDust[card.rarity] -= craftingCost;
		classes[card.className].missingDust.total -= craftingCost;
				
		missingDustTotal[card.rarity] -= craftingCost;
		missingDustTotal.total -= craftingCost;
	}
	
	// Adds a card through clicking on an <li><a> element
	function addCard(element, card) {
		if (card[selectedCardQuality] < getCardCopies(card)) {
			updateCard(card, element, 1);
			
			return true;
		}
		
		return false;
	}
	
	function removeCard(element, card) {
		if (card[selectedCardQuality] > 0) {
		    updateCard(card, element, -1);
		
		    return false;
		}
		
		return false;
	}
	
	function updateCard(card, element, number) {
	    card[selectedCardQuality] += number;
	
		var re = new RegExp(selectedCardQuality + "\\d");
		element.setAttribute("class", element.getAttribute("class").replace(re, selectedCardQuality + card[selectedCardQuality]));
		
		if (selectedCardQuality === "normal")
				updateNormalCard(card, number);
		else updateGoldenCard(card, number);
		
		updateLocalStorage();
		updateMissingCardsView(card.rarity, number);
		updateMissingDustView(card.rarity);
	}
	
	function getCardCopies(card) {
		return card.rarity === "legendary" ? 1 : 2;
	}
	
	function updateLocalStorage() {
		localStorage.setItem('classes', JSON.stringify(classes));
		localStorage.setItem('missingCardsTotal', JSON.stringify(missingCardsTotal));
		localStorage.setItem('missingDustTotal', JSON.stringify(missingDustTotal));
	}
	
	function updateMissingCardsView(rarity, number) {
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
		td.innerHTML = addThousandSeparator(classes[selectedClass].missingDust[rarity]);
		td = document.getElementById("classMissingDustTotal");
		td.innerHTML = addThousandSeparator(classes[selectedClass].missingDust.total);
		
		td = document.getElementById("totalMissingDust" + rarityCapitalized);
		td.innerHTML = addThousandSeparator(missingDustTotal[rarity]);
		td = document.getElementById("totalMissingDustTotal");
		td.innerHTML = addThousandSeparator(missingDustTotal.total);
	}
	
	function capitalizeFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}
	
	function addThousandSeparator(number) {
		return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	}
	
	function displayClassTabs() {
		var div = document.getElementById("classTabs");
		var list = document.createElement("ul");
		document.getElementById("classTabsBar").setAttribute("class", selectedClass);
			
		for (var className in classes) {
			var listItem = document.createElement("li");
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
					document.getElementById("classTabsBar").setAttribute("class", className);
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
			for (var name in cardList[rarity]) {
				var card = cardList[rarity][name];
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
	
	function displayMissingCards() {
		document.getElementById("missingCardsClassTitle").innerHTML = selectedClass.toUpperCase();
		
		for (var rarity in classes[selectedClass].missingCards) {
			var rarityCapitalized = rarity.charAt(0).toUpperCase() + rarity.slice(1);
			var td = document.getElementById("classMissing" + rarityCapitalized + "Normal");
			var normal = classes[selectedClass].missingCards[rarity][0];
			td.innerHTML = normal;
			td = document.getElementById("classMissing" + rarityCapitalized + "Golden");
			td.innerHTML = classes[selectedClass].missingCards[rarity][1];
		}
	}

	function displayMissingCardsTotal() {
		for (var rarity in missingCardsTotal) {
			var rarityCapitalized = rarity.charAt(0).toUpperCase() + rarity.slice(1);
			var td = document.getElementById("totalMissing" + rarityCapitalized + "Normal");
			var normal = missingCardsTotal[rarity][0];
			td.innerHTML = normal;
			td = document.getElementById("totalMissing" + rarityCapitalized + "Golden");
			td.innerHTML = missingCardsTotal[rarity][1];	
		}
	}
	
	function displayMissingDust() {
		for (var rarity in classes[selectedClass].missingCards) {
			var rarityCapitalized = rarity.charAt(0).toUpperCase() + rarity.slice(1);
			var td = document.getElementById("classMissingDust" + rarityCapitalized);
			var dust = classes[selectedClass].missingDust[rarity];
			td.innerHTML = dust.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
		}
	}
	
	function displayMissingDustTotal() {
		for (var rarity in missingDustTotal) {
			var rarityCapitalized = rarity.charAt(0).toUpperCase() + rarity.slice(1);
			var td = document.getElementById("totalMissingDust" + rarityCapitalized);
			var dust = missingDustTotal[rarity];
			td.innerHTML = dust.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
		}
	}	

	function initializeClasses() {
		classes = {};
		for (var className in classesEnum)
			classes[className] = new classHS(className);
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
	
	// Not done
	function handleKey(element, event) {
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
	}
	
	function lol(e) {
	   window.getSelection().removeAllRanges();
	   /*document.selection.empty()*/
	   console.log(e);
		//e.innerHTML = "lol";
	}
	
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
	  
		console.log("BACKING UP");
		var storedClasses = JSON.parse(localStorage.getItem('classes'));
		for (var className in storedClasses) {
			// level
			for (var rarity in storedClasses[className].cards) {
				for (var cardName in storedClasses[className].cards[rarity]) {
					var card = storedClasses[className].cards[rarity][cardName];
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
	
	function loadLocalStorage() {
		classes = JSON.parse(localStorage.getItem('classes'));
		missingCardsTotal = JSON.parse(localStorage.getItem("missingCardsTotal"));
		missingDustTotal = JSON.parse(localStorage.getItem("missingDustTotal"));
		currentDust = parseInt(localStorage.getItem("currentDust"));
		disenchantedDust = parseInt(localStorage.getItem("disenchantedDust"));	
	}
	
	return {
		init: function() {
		//	localStorage.clear();
		//	console.log(JSON.stringify(localStorage).length);
			
			if (typeof(Storage) !== "undefined") {
				var storedVersion = localStorage.getItem("version");
				
				if (storedVersion != version) {
					initializeClasses();
				
				    for (set in setsEnum)
				        importCards(set);
				
					for (var className in classes)
						sortCards(className);
					
					if (parseFloat(storedVersion) < parseFloat(version))

				    updateLocalStorage();
					localStorage.setItem("currentDust", currentDust);
					localStorage.setItem("disenchantedDust", disenchantedDust);
					localStorage.setItem("version", version);
				}
				else {
					loadLocalStorage();
				}
			}			
			
			document.oncontextmenu = function() {
                return false;
            }
			
			initSelectedCardQuality();
			displayClassTabs();
			displayCards(selectedClass);
			displayMissingCards();
			displayMissingCardsTotal();
			displayMissingDust();
			displayMissingDustTotal();
		}
	};
})();

window.onload = HSCollectionTracker.init();

//alert(Object.keys(classEnum).length);