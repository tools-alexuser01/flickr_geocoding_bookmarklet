/*  
  Written by Martin Kleppe, modified by Ken Mayer 2010.  
  Neither party is responsible for damage or loss due to use.
  http://www.flickr.com/groups/geotagging/discuss/72157594165549916/
*/
(function(window, undefined){
  
  var $,
    // BASE_URL = "http://192.168.1.208:8000/",
    BASE_URL = "https://cdn.rawgit.com/ubilabs/flickr_geocoding_bookmarklet/master/",
    JQUERY_SRC = "https://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js",
    GMAPS_API = "https://maps.google.com/maps/api/js?sensor=false&libraries=places&callback=?",
    SAVE_URL = "https://www.flickr.com/services/rest/?jsoncallback=?",
    POST_URL = "https://www.ﬂickr.com/services/rest/",
    BOOKMARK_URL = "https://www.flickr.com/groups/geotagging/discuss/72157594165549916/",
    STYLES = '#flickr_bookmarklet{font-size:12px;position:fixed;text-align:left;width:1000px;height:550px;z-index:20003;display:block;left:50%;margin-left:-505px;margin-top:-255px;top:50%;background-color:#FFF;padding:10px;-moz-box-shadow:0 0 8px rgba(0,0,0,0.5);-moz-border-radius:4px 4px 4px 4px;}#flickr_bookmarklet .foot,#flickr_bookmarklet .mode-title{display:none;}#flickr_bookmarklet .map{width:1000px;height:400px;}#flickr_bookmarklet .location-overlay-wrapper{margin:0 0 1em 0;}#flickr_bookmarklet .close{background-image:url("https://s.yimg.com/g/images/close_x_sprite.png");border:0 none;cursor:pointer;height:16px;margin:0;padding:0;position:absolute;right:10px;top:10px;width:16px;}#flickr_bookmarklet .maximize{color:#666;cursor:pointer;position:absolute;right:36px;text-align:right;text-decoration:underline;top:10px;width:100px;}#flickr_bookmarklet.maximized{width:auto;height:auto;top:10px;left:10px;right:10px;bottom:10px;margin:0;}#flickr_bookmarklet.maximized .map{width:auto;margin:0 -10px;}#flickr_bookmarklet_background{background-color:#000;height:100%;left:0;opacity:.35;position:fixed;top:0;width:100%;z-index:20002;cursor:pointer;filter:alpha(opacity=35);}#flickr_bookmarklet form input{margin:0 .5em 1em .5em;width:20em;}#flickr_bookmarklet .DisabledButt,#flickr_bookmarklet .Butt{margin-right:5px;}#flickr_bookmarklet div.spinner{background:url("https://s.yimg.com/g/images/progress/balls-24x12-white.gif") no-repeat scroll 0 5px #FFF;display:inline-block;height:25px;margin:0 0 -9px 1em;width:24px;}#flickr_bookmarklet #submit_form button{display:none;}#flickr_bookmarklet #submit_form{margin-left:1em;}#flickr_bookmarklet #submit_form,#flickr_bookmarklet #submit_form fieldset,#flickr_bookmarklet #submit_form fieldset div div{display:inline-block;}#flickr_bookmarklet.no_location{width:300px;height:70px;margin-left:-205px;margin-top:-35px;text-align:center;}#flickr_bookmarklet.no_location div{margin:.5em 0 1em 0;}#flickr_bookmarklet .link{float:right;}#flickr_bookmarklet .edit_instruction,#flickr_bookmarklet #submit_form button{display:none;}.pac-container{z-index:20004 !important;}.pac-container:after{display:none;}',
    API_KEY,
    IS_OWNER,
    USER_NSID,
    OWNER_NSID,
    PHOTO_ID,
    CSRF,
    MARKER_SRC = BASE_URL + "/arrow.png",
    PANEL_SRC = "/photo_geopanel_fragment.gne",
    map,
    autocomplete,
    lat, 
    lng, 
    zoom,
    map_type,
    initial_position,
    address,
    marker,
    geocoder,
    $map,
    $input,
    $spinner,
    $container,
    $background,
    $save, 
    $cancel,
    $submit_form,
    THE_TAGS,
    THE_DESCRIPTION,
    THE_TITLE,
    LAST_TAG_REMOVED=false;
    
    
  function log(){
    
    if (!window.location.href.match("log=true")){
      return false;
    }
    
    if (window.console && typeof window.console.log == "function"){
      console.log.apply(console, arguments);
    }
  }
  
  function initialize(){ 
    log("Initialize");
    
    if (!document.location.href.match("flickr.com")){
      if (document.location.href.match("github") || document.location.href.match("sumaato")) {
        // if he click the bookmarklet link at typolis, show him some infos who to use bookmarklets
        alert(
          "Localize Bookmarklet HowTo: \n " +
          "- Drag this link to your bookmarks. \n " +
          "- Rename it if you want. \n " +
          "- Visit your Flickr photo page. \n " +
          "- Click the bookmarklet to inject the fancy code."
        );
        
      } else {
        // ask user if he wants to move to Flickr
        var goto_flickr = confirm(
          "This bookmarklet does not work at this page.\n" +
          "Do you want to move over to Flickr?"
        );
        if (goto_flickr){
          document.location.href = "https://flickr.com/";
        }
      }
      return;
    }

    load_jquery();
    
    window.geocoding_bookmarklet = {
      initialize: initialize,
      reload: reload
    };
  }
  
  function reload(){
    log("Reload");
    
    show();
    $input.select();
    if (map){
      google.maps.event.trigger(map, "resize");
    }
  }
  
  function load_jquery(){
    log("Load jQuery");
    
    var script = document.createElement("script");
    script.src = JQUERY_SRC;
    script.onload = script.onreadystatechange = jquery_loaded;
    document.body.appendChild(script);
  }

  function load_styles(){
    
    var style = $("<style type='text/css'>" + STYLES + "</style>");    
    $("head").append(style);
    log("Load Styles", style);

  }
  
  function get_secrets(){
    log("Get Secrets");
    try {
      API_KEY = window.YUI_config.flickr.api.site_key;

      CSRF = window.auth.csrf;

      var url_parts = $("meta[name='og:url']").attr("content").split('/', 6);
      PHOTO_ID = url_parts[5];

      USER_NSID = window.auth.user.nsid;
      OWNER_NSID = $('.attribution-icon').attr('data-person-nsid');

      IS_OWNER = (USER_NSID == OWNER_NSID);

      return true;

    } catch (ex) {
      return false;
    }
  }
  
  function jquery_loaded(){
    log("jQuery loaded.");
    
    $ = jQuery;
    $.noConflict();
    load_styles();
    var loaded_secrets = get_secrets();
    if (!loaded_secrets) {
      alert('Sorry, could not correctly fetch your user info');
      return;
    }
    
    $.get(PANEL_SRC, function(html){
      log("Get panel");
      get_initial_position();
      draw_panel(html);
      update_clicks();

      init_form();
      $spinner.hide();
      
      $.getJSON(GMAPS_API, function(){
        init_map();
        init_marker();
        log("Ready")
      });

    });
  }
  
  function update_clicks(){
    log("Update Clicks");
    
    $("#photo-story-copyright").click(function(){
      reload();
      return false;
    });
  }
  
  function draw_empty_panel(){
    log("Draw empty panel");
    
    $container.addClass("no_location");
    $container.html(
      "<div>Uuuh no, this photo has no location :(</div>"
    );
    
    $cancel = $("<button class='Butt'>CLOSE THIS MESSAGE</button>");
    $container.append($cancel);
    $cancel.click(hide);
  }
  
  function draw_panel(html){
    
    var $close;
    
    $background = $("<div>", {
      id: 'flickr_bookmarklet_background',
      title: "Close"
    });
    
    $background.click(hide);
    
    $container = $("<div>", {id: 'flickr_bookmarklet'});
    $container.html(html);
    
    $close = $container.find(".close");
    
    $close.click(hide);
    
    $container.find(".breadcrumb h3").html(
      'Location for "'+
      $("meta[name='og:title']").attr("content") +
      '":'
    );

    $("body").append($container).append($background);
    
    log("Container:", $container, "and background:", $background, " drawn.");
  }
  
  function init_form(){
    
    var $form, $button, $link;

    $form = $container.find("form[name=location_search]");
    $input = $form.find("input");
    $button = $form.find("button");
    
    $form.prepend($("<label>", {
      "for": $input.attr("id")      
    }).html("Search:"));
    
    $form.submit(function(){
      address = $input.val();
      find(address);
      set_cookie("address", address);
      return false;
    });
    
    $spinner = $("<div class='spinner'/>");
    $save = $("<button class='Butt'>SAVE LOCATION</button>");
    
    $cancel = $("<button class='CancelButt'>CANCEL</button>");
    $container.append($save);
    $save.click(save_position);
    
    $link = $("<a href='https://www.flickr.com/groups/geotagging/discuss/72157594165549916/' target='_blank' class='link'>Feedback</a>");
    
    $submit_form = $("<div>", {id: "submit_form"});
    $container.append($cancel).append($spinner).append($submit_form).append($link);

    $cancel.click(cancel);
    
    log("Form", $form, "added.");
  }
  
  function getQueryVariable(variable, string) {
    
    var vars = string.split("&");
    if (vars[0] != undefined) {
      var first_var_parts = vars[0].split('?');
      var first_var_parts_count = first_var_parts.length;
      if (first_var_parts_count > 1) {
        vars[0] = first_var_parts[first_var_parts_count - 1];
      }
    }

    for (var i=0; i<vars.length; i++) {
      var pair = vars[i].split("=");
      if (pair[0] == variable) {
        return pair[1]; 
      }
    }
    return "";
  }
   
  function get_initial_position(){
    log("Get Initial Position");
    
    var map_url, match, last_location, parts = [];
    map_url = $(".static-maps").attr("href");
    if (map_url && getQueryVariable("fLat", map_url)){
      initial_position = {    
        lat  : parseFloat(getQueryVariable("fLat", map_url), 10),
        lng  : parseFloat(getQueryVariable("fLon", map_url), 10),
        zoom : 20
      };
    }
    last_location = get_cookie("location");
    
    if (last_location) {
      parts = last_location.split(",");
    } 
    
    if (initial_position) {
      lat = initial_position.lat;
      lng = initial_position.lng;
      zoom = initial_position.zoom;
    } else {
      lat = parseFloat(parts[0], 10) || 30;
      lng = parseFloat(parts[1], 10) || 0;
      zoom = parseFloat(parts[2], 10) || 2;
    }
    
    map_type = parts[3];
    
    address = get_cookie("address") || "Enter place name or address.";
    address = address.replace(/&nbsp;/g," ").replace(/^\s+/, "");
  }
  
  function init_map(){
    
    log("Init Map");
    
    $map = $container.find(".map");
    
    map = new google.maps.Map($map[0], {
      zoom: zoom,
      center: new google.maps.LatLng(lat, lng),
      mapTypeId: map_type || google.maps.MapTypeId.ROADMAP,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
      }
    });
    
    autocomplete = new google.maps.places.Autocomplete($input[0]);
    autocomplete.bindTo('bounds', map);
    
    google.maps.event.addListener(autocomplete, 'place_changed', function() {
      var place = autocomplete.getPlace();
      if (place.geometry.viewport) {
        map.fitBounds(place.geometry.viewport);
        position(place.geometry.location);
      } else {
        map.setCenter(place.geometry.location);
        map.setZoom(17);
      }
      position(place.geometry.location);
      marker.setPosition(place.geometry.location);
    });
    
    geocoder = new google.maps.Geocoder();
    
    $input.val(address).select();
  }
  
  function init_marker(){
    
    log("Init Marker");
    
    var icon, shadow, infowindow, message, show_info, hide_info, info_hidden;
      
    icon = new google.maps.MarkerImage(MARKER_SRC,
      new google.maps.Size(21, 29),
      new google.maps.Point(0,0),
      new google.maps.Point(9, 28)
    );

    shadow = new google.maps.MarkerImage(MARKER_SRC,
      new google.maps.Size(21, 18),
      new google.maps.Point(0,29),
      new google.maps.Point(2, 17)
    );
    
    marker = new google.maps.Marker({
      map: map,
      title: "Drag me!" ,
      draggable: true,
      visible: true,
      icon: icon,
      position: map.getCenter(),
      shadow: shadow
    });
    
    message = "<h3>Drag me</h3>";
    
    infowindow = new google.maps.InfoWindow();
    info_hidden = true;
    
    show_info = function() {
      infowindow.setContent(message);
      infowindow.open(map, marker);
      info_hidden = false;
    };
    
    hide_info = function(){
      infowindow.close();
      info_hidden = true;
    };

    google.maps.event.addListener(marker, 'click', function(){
      if (info_hidden){
        show_info();
      } else {
        hide_info();
      }
    });
    
    google.maps.event.addListener(marker, 'dragend', function(){
      position(marker.getPosition());
    });
    
    google.maps.event.addListener(map, 'click', function(event) {
      if (event.latLng){
        hide_info();
        position(event.latLng);
      }
    });    
  }
  
  function position(latLng){
    
    log("Update position");
    
    marker.setPosition(latLng);
    
    lat = latLng.lat();
    lng = latLng.lng();
    
    if (!marker.getVisible()){
      marker.setVisible(true);
    }
    
    var info = [
      latLng.toUrlValue(),
      map.getZoom(),
      map.getMapTypeId()
    ];
    
    set_cookie("location", info.join(","));
  }
  
  function save_position(){
    
    log("Save position");
    
    var theDescription ="";
    var theTitle="";
    
    if ($save.hasClass("DisabledButt")){ return; }
    
    $save.removeClass("Butt").addClass("DisabledButt");
    var data = {};
    
    $spinner.show();

    data = {
      format: "json",
      api_key: API_KEY,
      photo_id: PHOTO_ID,
      csrf: CSRF,
      lat: lat,
      lon: lng,
      accuracy: Math.min(16, map.getZoom()),
      method: "flickr.photos.geo.setLocation",
      cachebust: Number(new Date())
    };
    
    if (IS_OWNER) {
      $.getJSON(SAVE_URL, data, function(saveResponse){          
        if (saveResponse.stat == "ok"){
          $submit_form.html("Location Saved");
          getInfo();
        } else {
          $submit_form.html("Error: " + saveResponse.message);
        }
      });
    } else {
      getInfo();
    }
  }

  // gets the photo title, description, and tags       
  function getInfo() {
    
    log("Get Photo Info");
    
    var data = {
      format: "json",
      api_key: API_KEY,
      csrf: CSRF,
      photo_id: PHOTO_ID,
      method: "flickr.photos.getInfo",
      cachebust: Number(new Date())
    };

    $.getJSON(SAVE_URL, data, function(infoResponse){
      if (infoResponse.stat == "ok"){
        THE_TAGS = infoResponse.photo.tags.tag;
        THE_DESCRIPTION = infoResponse.photo.description._content;      
        THE_TITLE = infoResponse.photo.title._content;
        removeTags(THE_TAGS);
      } else {
        $submit_form.html("Error getting data: " + infoResponse.message);
      }
    });
  }

  function removeTags(tagArray) {
    
    log("Remove Tags");
        
    var removeArray = [];
    
    if (IS_OWNER) {
      $.each(tagArray, function() {
        if (this.raw.indexOf("geo:")>-1) {
          removeArray.push(this.id);  
        }
      });
    } else {
      $.each(tagArray, function() {
        if (this.raw.indexOf("geo:")>-1 && this.author==USER_NSID){
          removeArray.push(this.id);
        }
      });
    }
       
    while (removeArray.length > 0) { 
      var removeMe=removeArray.shift();
    
      if (removeArray.length == 0) { 
        LAST_TAG_REMOVED = true;
      }
        
      data = {
        format: "json",
        api_key: API_KEY,
        csrf: CSRF,
        photo_id: PHOTO_ID,
        tag_id: removeMe,
        method: "flickr.photos.removeTag",
        cachebust: Number(new Date())  
      };
      
      $.getJSON(SAVE_URL, data, function(removeResponse){
        if (removeResponse.stat == "ok" && LAST_TAG_REMOVED) { 
          saveGeotags(); 
        }
      });
    }
    if (!LAST_TAG_REMOVED) {
      saveGeotags(); 
      // if there were no tags to remove
    }
  }

  // saves the geotags
  function saveGeotags() {
    
    log("Save Geo Tags");
        
    var data, theTag = "geo:lat=" + lat + " geo:lon=" + lng + " geotagged";
    data = {
      format: "json",
      api_key: API_KEY,
      csrf: CSRF,
      photo_id: PHOTO_ID,
      tags: theTag,
      method: "flickr.photos.addTags",
      cachebust: Number(new Date())
    };
    
    $.getJSON(SAVE_URL, data, function(tagResponse){
      if (tagResponse.stat == "ok"){
        $submit_form.html("Geotags saved");
        if (IS_OWNER){
          setDescription();
        } else {
          addComment(theTag);
        }
      } else {
        $submit_form.html("Geotag error: " + tagResponse.message);
        if (!IS_OWNER) {
          theTag = "http://maps.google.com/maps?q=loc:" + theTag;
          addComment(theTag);
        }
      }
    });
  }

  // puts the loc.alize.us link in a comment
  function addComment(theTag) {
    
    log("Add Comment");
        
    var theComment = "See where this picture was taken.";
    
    if (theTag.indexOf("google.com")>0){
      theTag = theTag.replace("geo:lat=","");
      theTag = theTag.replace("geo:lon=",",");
      theTag = theTag.replace(" geotagged","&z=18");
      theTag = theTag.replace(/ /g,"");
      theComment = theComment + ": " + theTag + " <a href='" + BOOKMARK_URL + "'>[?]</a>";
    } else {
      theComment = "<a href='http://loc.alize.us/#/flickr:" + PHOTO_ID + "'>" + theComment + ".</a> <a href='" + BOOKMARK_URL + "'>[?]</a>";
    }
    
     var data = {
      format: "json",
      api_key: API_KEY,
      csrf: CSRF,
      photo_id: PHOTO_ID,
      comment_text: theComment,
      method: "flickr.photos.comments.addComment",
      cachebust: Number(new Date())
    };
    
    $.getJSON(SAVE_URL, data, function(comResponse){
      if (comResponse.stat == "ok"){
        $submit_form.html("Comment saved");
        window.location.reload();  
        // closes the map window after saving all locations and tags
      } else {
        $submit_form.html("Comment error: " + comResponse.message);
      }
    });
  }     

  // appends the loc.alize.us link to the description
  function setDescription() {
    log("Set Description");
    
    var theDescription = expungeLocalize(THE_DESCRIPTION);
    theDescription = theDescription + "\r\r<a href='http://loc.alize.us/#/flickr:" + PHOTO_ID + "'>See where this picture was taken.</a> <a href='" + BOOKMARK_URL + "'>[?]</a>";
    
     var data = {
      format: "json",
      api_key: API_KEY,
      csrf: CSRF,
      photo_id: PHOTO_ID,
      description: theDescription,
      title:THE_TITLE,
      method: "flickr.photos.setMeta",
      cachebust: Number(new Date())
    };
    
    $.getJSON(SAVE_URL, data, function(localResponse){

      if (localResponse.stat == "ok"){
        $submit_form.html("Saved");
        window.location.reload();  // closes the map window after saving all locations and tags
      } else {
        $submit_form.html("Loc.alize.us error: " + localResponse.message);
      }
    });
  }     
 
  function expungeLocalize(theString) {
    
    log("Expunge Localize");
    
    var regEx = new RegExp("<a.*/a>", "gi");
    var theLinks = theString.match(regEx);
    if (theLinks) {
      for (var i=0;i<theLinks.length;i++){
        if (theLinks[i].indexOf("geolicker")>0) {
          theString = theString.replace(theLinks[i],"");
        }
      }        
    }
    return theString;
  }
      
  function find(address){
    
    log("Find Address", address);
    
    var options = {
      address: address,
      bounds: map.getBounds()
    };
    
    geocoder.geocode(options, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        var geometry = results[0].geometry;
        map.fitBounds(geometry.viewport);
        position(geometry.location);
      } else {
        alert("Could not find location.");
        $input.select();
      }
    });
  }
  
  function set_cookie(name, value){
    
    log("Set Cookie", name, "to", value);
    
    var one_year = 365*60*60*24*200,
      expire = new Date((new Date().getTime()) + one_year);
    
    document.cookie = "ubilabs_" +  
      name + "=" + 
      escape(value) + "; expires=" + 
      expire.toGMTString() + "; path=/";
  }
  
  function get_cookie(name){
    
    log("Get Cookie", name);
    
    var regex, match;
    
    regex = new RegExp("ubilabs_" + name + "[^\=]*=([^\;]*)");
    match = document.cookie.match(regex);
    
    return match && unescape(match[1]);
  }

  function cancel(){
    
    log("Cancel");
    
    var latLng;
    
    if (initial_position){
      latLng = new google.maps.LatLng(
        initial_position.lat, 
        initial_position.lng
      );
      position(latLng);
      map.setCenter(latLng);
      map.setZoom(initial_position.zoom);
    } else {
      marker.setVisible(false);
    }
    
    $save.removeClass("Butt").addClass("DisabledButt");
    $submit_form.html("");
    hide();  
  }

  function show(){
    
    log("Show");
    
    $background && $background.show();
    $container && $container.show();
  }
  
  function hide(){
    
    log("Hide");
    
    window.location.reload();
  }
  
  initialize();

})(window);
