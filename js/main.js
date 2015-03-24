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
	
	var expansionsEnum = {
	    classic: 450,
		naxxramas: 30
	};
	
	var classes = null;
	
	//alert(Object.keys(classEnum).length);
	
    var selectedClass = "neutral";
	var selectedCardQuality = "normal";
	
    function card(name, rarity, cost) {
	    this.name = name;
		this.rarity = rarity;
		this.cost = cost;
		this.normal = 0;
		this.golden = 0;
	}
	
	function class_(name) {
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
		}
	}
	
	function initialize() {
	    if (classes == null) {
		    initializeClasses();
		}
		
		importCards("basic.txt");
		importCards("classic.txt");
		importCards("naxxramas.txt");
		
		for (var iii in classes) {
		    sortCards(iii);
		}

		displayClassTabs();
		displayCards(selectedClass);
	}
	
	function sortCards(b) {
	    var cardList = classes[b].cards;
	    for (var rarity in cardList) {
		    var sortedList = [];
		    for (var a in cardList[rarity]) {
		        sortedList.push([a, cardList[rarity][a]]);
		    }
		    sortedList.sort(function(a, b) { return a[1].cost == b[1].cost ? a[1].name.localeCompare(b[1].name) : a[1].cost - b[1].cost });
		
		    var rv = {};
            for (var i = 0; i < sortedList.length; ++i)
                if (sortedList[i] !== undefined)
			        rv[sortedList[i][0]] = sortedList[i][1];
				
		    cardList[rarity] = rv;
		}
	}
	
	function addCard(element, card) {
	    //var card = classes[selectedClass].cards[element.innerHTML];
	    card[selectedCardQuality]++;
		
		var re = new RegExp(selectedCardQuality + "\\d");
		
		element.setAttribute("class", element.getAttribute("class").replace(re, selectedCardQuality + card[selectedCardQuality]));
		
		return true;
	}
	
	function displayClassTabs() {
	    var div = document.getElementById("classTabs");
		var list = document.createElement("ul");
		document.getElementById("classTabsBar").setAttribute("class", selectedClass);
		
	    for (var class__ in classes) {
		    var listItem = document.createElement("li");
			var listItemLink = document.createElement("a");
			var span = document.createElement("span");
			span.innerHTML = classes[class__].level;
			
			span.setAttribute("contenteditable", true);
			/* BECAUSE EVENT LISTENERS NO WORKY ON THIS SPAN.
			   USE FORM INSTEAD? */
			span.setAttribute("onkeypress", "return handleKey(this, event)");
			span.setAttribute("onblur", "lol(this)");
			span.setAttribute("onpaste", "return false");
			span.setAttribute("ondrop", "return false");
			/* --------------------------------------------- */
			listItemLink.appendChild(span);
			if (class__ === "neutral")
			    listItemLink.innerHTML = class__;
		    else {
			    listItemLink.innerHTML = class__ + "<br>(" + listItemLink.innerHTML;
			    listItemLink.innerHTML += ")";
			}
			(function (class__) {
			listItemLink.addEventListener("click", function() { document.getElementById("classTabsBar").setAttribute("class", class__); selectedClass = class__; displayCards(class__); });
			}(class__))
			listItemLink.setAttribute("class", class__ + " " + "noselect");
			
			listItem.appendChild(listItemLink);
			list.appendChild(listItem);
		}
		div.appendChild(list);
	}
	
	function displayCards(a) {
	    var cardList = classes[a].cards;
		
		for (var a in raritiesEnum) {
		    var list = document.getElementById("list_" + a);		
		    while (list.firstChild) {
		        list.removeChild(list.firstChild);
		    }
			// TEMPORARY TO MAKE LISTS FIXED WIDTH WHEN EMPTY
			//list.innerHTML="&nbsp";
		}
	    
		for (var rarity in cardList) {		    
	        var list = document.getElementById("list_" + rarity);
			for (var card in cardList[rarity]) {
			var card__ = cardList[rarity][card];
	            var listItem = document.createElement("li");
	            var listItemLink = document.createElement("a");
	            listItemLink.textContent = card;
				(function (card__) {
			    listItemLink.addEventListener("click", function() { addCard(this, card__); });
				}(card__))
			    listItemLink.setAttribute("class", "normal" + cardList[rarity][card].normal + " " + "golden" + cardList[rarity][card].golden + " " + "noselect");
		
	            listItem.appendChild(listItemLink);
	            list.appendChild(listItem);
			}
		}
	}
	
	function initializeClasses() {
	    classes = {};
	    for (var class__ in classesEnum)
		    classes[class__] = new class_(class__);
	}
	
	function importCards(file) {
		var cardData = readTextFile(file);
		cardData = cardData.replace(/(\r)/gm, "");
		var cardLines = cardData.split("\n");
		var cardClass;
		var i;
		for (i = 0; i < cardLines.length; i++) {
		    var cardLine = cardLines[i].split(",");
			if (cardLine.length == 1 && cardLine != "") {
			    cardClass = cardLine[0];
			}
			else if (cardLine != "") {
			    classes[cardClass].addCard(new card(cardLine[0], cardLine[1], cardLine[2]));
			}
		}
	}
	
	function readTextFile(file) {
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
        rawFile.open("GET", "data/" + file, false);
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
	
	initialize();
	
	//console.log(Object.keys(classes.neutral.cards));
