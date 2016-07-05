'use strct';
    //root 
    var g = {
        data: null,
        force:null
    };
    //local Storage use
    if(localStorage) localStorage.clear();
    else alert('your brower is not support!');
    //VIZ area
    var width = 1624, height = 800;
    var tipW = 300, tipH = 400;

    // tool tip init 
    var barTooltip = d3.select("body").append('div')
                    .attr("class","tooltip")
                    .style("opacity",0)
                    .attr("width", tipW)
                    .attr("hight",tipH);
    //Create a sized SVG surface within viz:
    var  svg = d3.select("#viz")
        .append("svg")
        .attr("width", width)
        .attr("height", height); 
        
    g.link = svg.selectAll(".link");
    g.node = svg.selectAll(".node");

    //Create a graph layout engine:
    g.force = d3.layout.force()
        .linkDistance(50)
        .charge(-1000)
        .gravity(0.05)
        .size([width, height])
        //that invokes the tick method to draw the elements in their new location:
        .on("tick", tick);            

     //legend 
    function drawLegend() {
        var ordinal = d3.scale.ordinal()
        .domain(["starting point(keyword)", "toggleable name nodes", "expanded set of nodes - address,phone, email and etc","collapsed property node", "expanded property node","leaf node, hoverable for lookup"])
        .range([ "purple", "#31C1D3", "lightgreen", "#3182bd", "#c6dbef","#fd8d3c"]);

        var svgLg = d3.select("svg");

        svgLg.append("g")
            .attr("class", "legendOrdinal")
            .attr("transform", "translate(20,"+(height-150)+")");

        var legendOrdinal = d3.legend.color()
            .shape("path", d3.svg.symbol().type("circle").size(150)())
            .shapePadding(15)
            .scale(ordinal); 

        svgLg.select(".legendOrdinal")
        .call(legendOrdinal); 
    }
    
    drawLegend();

    var searchSNANetwork = function(keyword){

        var select = (keyword === undefined) ? $("input[type='radio'][name='rbtPipl']:checked").val() : keyword;

        //use a global var for the data:
        var q = smdb.SNANetwork(0, select);  //0->name search
        
        $.when(q).then(function(data){

            g.data = data;
            //Draw the graph:
            update();

            //toggle off child node
            for(i=0;i<g.data.children.length;i++){
                toggle(g.data.children[i]);
            };
        });
    };

    var listFoundNodes = function() {

        $("#rbtDiv").empty();
        var keyObj = document.getElementById("qKey");
        var q = smdb.APIRequest(getClkType(keyObj.value), keyObj.value);

        $.when(q).then(function(d){
            var s = d.hits.hits;
            if(s.length===1) searchSNANetwork(s[0]._source.json.names[0].display)
            else {
                for(i=0;i<s.length;i++){
                    var rdoVal = s[0]._source.json.names[0].display;
                    $("#rbtDiv").append("<input type='radio' name='rbtPipl' value='"+s[0]._source.json.names[0].display+"' onclick='searchSNANetwork()' />"+s[0]._source.json.names[0].display);
                    // var radioBtn = $('<div onclick="searchSNANetwork()">'+rdoVal+'</div>');
                    // radioBtn.appendTo("#rbtDiv");
                }
            }
        })
    }

    function update() {

        //iterate through original nested data, and get one dimension array of nodes.
        // var nodes = flatten(g.data);

        var nodes = flatten(g.data);
        
        //Each node extracted above has a children attribute.
        //from them, we can use a tree() layout function in order
        //to build a links selection.
        var links = d3.layout.tree().links(nodes);

        // pass both of those sets to the graph layout engine, and restart it
        g.force.nodes(nodes)
            .links(links)
            .start();

        //-------------------
        // create a subselection, wiring up data, using a function to define 
        //how it's suppossed to know what is appended/updated/exited
        g.link = g.link.data(links, function (d) {
            return d.target.id;
        });

        //Get rid of old links:
        g.link.exit().remove();

        //Build new links by adding new svg lines:
        g.link
            .enter()
            .insert("line", ".node")
            .attr("class", "link");

        // create a subselection, wiring up data, using a function to define 
        //how it's suppossed to know what is appended/updated/exited
        g.node = g.node.data(nodes, function (d) {
            return d.id;
        });
        //Get rid of old nodes:  
        g.node.exit().remove();
        //-------------------
        //create new nodes by making groupd elements, that contain circls and text:
        var nodeEnter = g.node.enter().append("g")
            .attr("class", "node")
            .on("click", function(d) {
                var newChildren = Number(localStorage.getItem('children')) + 1;
                localStorage.setItem('children',newChildren);
                return click(d,getClkType(d.name)); 
            })
            .call(g.force.drag);
        //circle within the single node group:
        nodeEnter.append("circle")
            .on("mouseover",function(d){
                if(!d.children && !d._children) {
                    if(d.isQualified === undefined || d.isQualified) { 
                        barTooltip.transition().duration(500).style('opacity',0.9);
                        if(d.name !== undefined)
                            barTooltipServiceCall(d.name);
                    }
                }
            })
            .on("mouseout",function(d){
                barTooltip.transition().duration(1500)
                .style('opacity',0)
            })
            .attr("r", function (d) {
                return 5;//Math.sqrt(d.size) / 6|| 5.5;
            })
        // shape icons to svg    
        var icons = nodeEnter.append("svg:foreignObject")
            .attr("x",function(d) { return d.ntype === "root" ? -25 : -15; })
            .attr("y",function(d) { return (d.ntype === "root") ? -28 : -15; })
            .attr("height", 30)
            .attr("width", 30)
            .append("xhtml:body")
            .html(function(d){
                if(d.image === undefined){
                    var _svgIcon = null;
                    var _name = d.name.toString(); 
                    if(d.ntype === "root"){
                        _svgIcon = '<i class="fa fa-dot-circle-o fa-4x"></i>';
                    }
                    if(_name.indexOf('#') !== -1) { 
                        _svgIcon = '<i class="fa fa-expand fa-2x"></i>';
                    } else {
                        switch(d.name) {
                            case "addresses":
                                _svgIcon = '<i class="fa fa-home fa-2x"></i>'; break;
                            case "phones":
                                _svgIcon = '<i class="fa fa-phone fa-2x"></i>'; break;
                            case "urls":
                                _svgIcon = '<i class="fa fa-link fa-2x"></i>'; break;
                            case "name":
                                _svgIcon = '<i class="fa fa-user fa-2x"></i>'; break;
                            case "emails":
                                _svgIcon = '<i class="fa fa-envelope-o fa-2x"></i>'; break;
                            case "relation":
                                _svgIcon = '<i class="fa fa-code-fork fa-2x"></i>'; break;
                        };
                    }
                    return _svgIcon;
                }
            });
        
        var setEvents = icons
                        .on("mouseover",function(d){
                            if(!d.children && !d._children) { 
                                barTooltip.transition().duration(500)
                                .style('opacity',0.7);
                                barTooltipServiceCall(d.name);
                            }
                        })
                        .on("mouseout",function(d){
                            barTooltip.transition().duration(500)
                            .style('opacity',0)
                        });
                        
        nodeEnter.append("svg:image")
            .attr("xlink:href",function(d){ 
                if(d.image !==undefined)
                    return d.image; 
            })                    
            .attr("x",function(d) { return -25; })
            .attr("y",function(d) { return -25; })
            .attr("class","img-circle")
            .attr("height", 50)
            .attr("width", 50)
            .on("mouseover",function(d){
                if(d.ntype === "root"){
                    var htmlTmp = '<div class="container-fluid"><h3>'+d.name+'</h3>';
                    var imgCount = 0;    
                    for(i=0;i<d.childnodes;i++){
                        htmlTmp += '<div class="row">';
                        htmlTmp += (d.image !== undefined && imgCount ===0) ? '<div class="col-sm-5"><img src="'+d.image+'" style="width:150px;" /></div>' : '<div class="col-sm-5">&nbsp</div>';

                        htmlTmp += '<div class="col-sm-2">'+d.children[i].name+'</div>';
                        htmlTmp += '<div class="col-sm-5">';
                        var _childNodes = (d.children[i].children === null) ? d.children[i]._children.length : d.children[i].children.length;
                        for(j=0;j<_childNodes;j++) {
                            htmlTmp += d.children[i].children === null ? d.children[i]._children[j].name  + '</br>' : d.children[i].children[j].name + '</br>';
                        }
                        htmlTmp += '</div></div>';
                        imgCount++;
                    }
                    htmlTmp += '</div>';
                    
                    barTooltip.transition().duration(500).style('opacity',1);
                    barTooltip.html(htmlTmp).style("left", (d3.event.pageX+10) + "px").style("top", (d3.event.pageY)+ 'px');
                }
                else if(!d.children && !d._children) {
                    if(d.isQualified === undefined || d.isQualified) { 
                        barTooltip.transition().duration(500).style('opacity',0.9);
                        if(d.name !== undefined)
                            barTooltipServiceCall(d.name);
                    }
                }
            })
            .on("mouseout",function(d){
                barTooltip.transition().duration(500)
                .style('opacity',0)
            });

        //text within the single node group:
        // nodeEnter.append("text")
        //     .attr("dy", ".9em")
        //     .attr("class","baseText")
        //     .text(function (d) {
        //                 return d.name;
        //             });
        var cats = ["urls","addresses","phones","relation","emails"];
        nodeEnter.append("text")
            .attr("dy", function(d) { return "1.6em"; })
            .attr("dx", function(d) { return d.name.toString().indexOf('#') !== -1 ? "0.8em" : "" })
            .text(function (d) {
                    if(!cats.includes(d.name) && d.ntype !=="root"){
                        return d.name;
                    }
                    else{
                        return null;
                    }
                });

        //All nodes, do the following:
        g.node.select("circle")
            .style("fill", color); //calls delegate
        //-------------------
        
        //update nodes amd transfer to new position
        // var nodeUpdate = g.node.transition()
        //     .attr("transform", function(d){ return "translate("+ d.y+","+ d.x+")"});
        // nodeUpdate.select("circle");
        
        // nodeUpdate.select("text").style("fill-opacity",1);

    }

    // Invoked from 'update'.
    // The original source data is not the usual nodes + edge list,
    // but that's what's needed for the force layout engine. 
    // So returns a list of all nodes under the root.
    function flatten(data) {
        
        //call request
        // var r =smdb.APIRequest(null, "AVTQHxjAUd9mz_GNMhiv");
        var nodes = [],i = 0;

        // $.when(r).then(function(d){
            // var s = d.hits.hits[0]._source.json;
            
            // var snaNetwork = smdb.SNANetwork();
            
            //count only children (not _children)
            //note that it doesn't count any descendents of collapsed _children 
            //rather elegant?
            function recurse(node) {
                if (node.children) { 
                    node.children.forEach(recurse);
                    node.childnodes = node.children.length;
                    if(node.name === "addresses" && node.children.length>0) {
                        // for(i=0;i<node.children.length;i++) {
                        //     node.children[i].expendable = true;
                        // }
                    }
                }

                if (!node.id) node.id = ++i;
                nodes.push(node);
                // console.log(JSON.stringify(nodes));
                // console.log(node);
            }
            recurse(data);

            //Done:
            // console.log("flated:");
            console.log(nodes);        
            return nodes;
                
        // })
        
    }

    //Invoked from 'update'
    //Return the color of the node
    //based on the children value of the 
    //source data item: {name=..., children: {...}}
    function color(d) {
        if(d.color !== undefined) return d.color;
        else {
            return d._children ? "#3182bd" // collapsed package
                        : d.children ? "#c6dbef" // expanded package
                        : "#fd8d3c"; // leaf node
        }
    }

    // Toggle children on click by switching around values on _children and children.
    function click(d,t) {
        if (d3.event.defaultPrevented) return; // ignore drag
        
        if(!d.children && !d._children){

            if(d.isQualified === undefined || (d.name==="addresses" && d.isQualified)) {

                var i = 100;
                var pObj = { t:t, k: d.name };
                var _extQuery = smdb.SNANetworkExtend(pObj);  
                $.when(_extQuery).then(function(dt){
                    if(dt.name !== undefined){ 
                        var children = [];
                        d.children = children;
                        // var _new = $.map(dt,function(_dt) { return _dt; });
                        //if(!dt.id) dt.id = ++i;
                        function recurse(node) {
                            if (node.children) node.children.forEach(recurse);
                            if (!node.id) node.id = localStorage.getItem('children') + ++i;
                        }
                        recurse(dt); 
                        
                        d.children.push(dt);
                        
                        update();
                    }
                })
            }
        }
        
        else {
            
            if (d.children) {
                d._children = d.children;
                d.children = null;
            } else {
                d.children = d._children;
                d._children = null;
            }
            //
            update();
        }
    }

    function toggle(d) {
        if (d.children) {
                d._children = d.children;
                d.children = null;
            } else {
                d.children = d._children;
                d._children = null;
            }
            
            update();
    }

    //event handler for every time the force layout engine
    //says to redraw everthing:
    var rootPosition = { x:width/5, y:height/10 };
    function tick() {
        //redraw position of every link within the link set:
        g.link.attr("x1", function (d) {
            return d.source.x-rootPosition.x;
        })
            .attr("y1", function (d) {
            return d.source.y-rootPosition.y;
        })
            .attr("x2", function (d) {
            return d.target.x-rootPosition.x;
        })
            .attr("y2", function (d) {
            return d.target.y-rootPosition.y;
        });
        //same for the nodes, using a functor:
        g.node.attr("transform", function (d) {
            return "translate(" + (d.x-rootPosition.x) + "," + (d.y-rootPosition.y) + ")";
        });
    }

    //simple logic for types, //todo later
    function getClkType(n) {
        var rType = 0;  //defaulted name type
        if(!isNaN(n)) return rType = 1;   //phone
        else if(n.indexOf(",") > 0 ) rType = 2; //address
        else if(n.indexOf("@") > 0 ) rType = 3; //email
        else if(n.indexOf("www.") > 0) rType = 4 //url
        return rType;
    }

    function extractDomain(url) {
        var domain;
        //find & remove protocol (http, ftp, etc.) and get domain
        if (url.indexOf("://") > -1) {
            domain = url.split('/')[2];
        }
        else {
            domain = url.split('/')[0];
        }

        //find & remove port number
        domain = domain.split(':')[0];

        return domain;
    }

    function barTooltipServiceCall(name){
            var htmlTmp = "loading...";
            barTooltip.html(htmlTmp)
                .style("left", (d3.event.pageX+10) + "px")
                .style("top", (d3.event.pageY)+ 'px');

            var q = smdb.APIRequest(getClkType(name),name);

            $.when(q).then(function(r){
                if(r.hits.hits.length === 0) {
                    return "n/a";
                } 
                var s = r.hits.hits[0]._source.json; //dups, pick first node
                var name = s.names[0].display;
                var urls = "", lvAdds = "", spkLang = "", disName = "", hsRela="", hsPhone="";
                
                var htmlTmp = "<p>Name: "+ name +"</p>";
                
                if(s.Addresses){
                    for(i=0;i< s.Addresses.length;i++){
                        lvAdds += s.Addresses[i].display + '<br />';
                    }
                    htmlTmp += "<p>Address(s): "+ lvAdds +"</p>";
                }

                if(s.dob){
                    htmlTmp += "<p>Age: "+ s.dob.display +"</p>";
                }

                if(s.languages){
                    for(i=0;i< s.languages.length;i++){
                        spkLang += s.languages[i].display + '<br />';
                    }
                    htmlTmp += "<p>Language(s): "+ spkLang +"</p>";
                }

                if(s.relationships){
                    for(i=0;i< s.relationships.length;i++){
                        hsRela += s.relationships[i].names[0].display + '<br />';
                    }
                    htmlTmp += "<p>Relation(s): "+ hsRela +"</p>";
                }

                if(s.urls){
                    for(i=0;i< s.urls.length;i++){
                        urls += '<a href="'+s.urls[i].url+'">'+ extractDomain(s.urls[i].url)+'</a><br />';
                    }
                    htmlTmp += "<p>Url(s): " + urls +"</p>";
                }

                barTooltip.html(htmlTmp);
            });
    }

    function reset_zoom() {
			//Reset the zoom object (or else it will just jump straight back afterwards anyway)
			zoom.scale(1);
			zoom.translate([0, 0]);
			
			//Reset the zoom on the container
			container.transition().duration(750).attr("transform", "translate(0,0)scale(1)");
		  
    }

    function lock_nodes(d) {

        function recurse(node) {
                if (node.children) { 
                    node.children.forEach(recurse);
                    node.fixed = true;
                }
        }
        recurse(g.data);
    }

    function unlock_nodes() {
        function recurse(node) {
                if (node.children) { 
                    node.children.forEach(recurse);
                    node.fixed = false;
                }
        }
        recurse(g.data);
    }



