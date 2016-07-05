'use strct';
var smdb;
(function (smdb) {
    
    smdb.APIRequest = function(type, key){

        var optArray = ["json.names.display",     //0
                        "json.phones.number",     //1
                        "json.addresses.display", //2
                        "json.emails.address", //3
                        "json.urls.url"];   //4
        // var url = "http://localhost:9200/test/person/_search?q="+ optArray[type], q=null;
        // query = url+":"+ key;
        // return $.get(query);
        var url = window.location.href
        var data = { "query": { "match_phrase": { "json.names.display": key   } } };    
        if(type==1) data = { "query": { "match_phrase": { "json.phones.number": key   } } };
        else if(type==2) data = { "query": { "match_phrase": { "json.addresses.display": key   } } };
        else if(type==3) data = { "query": { "match_phrase": { "json.emails.address": key   } } };

        var esQuery = (url === "http://127.0.0.1:3033/home") ? "http://localhost:9200/test/person/_search" : "http://to1vl092:9200";
        return $.ajax({
            type: 'POST',
            url: esQuery,
            crossDomain: true,
            data: JSON.stringify(data),
            success: function(response){
                var data = response.hits.hits;
                var total = response.hits.total;
                //var network = sasBuildNetwork.netUtils(response,freq);
                //netClustering.cluster(network.nodes,network.edges);
                //update(network.nodes, network.edges);
                //console.log(network);
                console.log("elastic search results: " + total , data);
            },
            error: function(err){
                console.log(err);
            }
        });
    }
    
    smdb.SNANetworkExtend = function(pObj){
      var d = $.Deferred();
      var elasticserch = smdb.APIRequest(pObj.t, pObj.k);
      
      $.when(elasticserch,pObj).then(function(data,pObj){
         var idx = 0;//26 duplicates here
        //  var s = data[0].hits.hits[idx]._source.json;
         var rSrt = data[0].hits.hits;
         //var queryPerson = data.hits.hits[idx]._source.json.names[0].display 
         var _pipl = {};
         var relation = {}, names = {}, emails = {}, phones = {}, addresses = {};
         var children = [];

            if(pObj.t > 0) {  // find pipl
            
                //names collections
                names = { name: "#" + localStorage.getItem('children'), size:13000,color: "red"};
                names.children = children;
                                        
                if(rSrt) {  //add name obj in children array
                    rSrt.forEach(function(p){
                        if(chkDuplicatedChildren(pObj,p)) {
                              names.children.push({name : p._source.json.names[0].display });
                        }
                    });
                }
                names = names.children.length > 0 ? names : {};
                d.resolve(names);

            } else {  //find email, address and phone
                _pipl = { name: "#" + localStorage.getItem('children'), size:13000,color: "lightgreen"};
                _pipl.children = children;                            


                if(rSrt) {  //add name obj in children array

                    rSrt.forEach(function(p){

                        if(p._source.json.emails) {
                            //email collections
                            children = [];
                            emails = { name: "emails", size:3000};
                            emails.children = children;
                                                    
                            p._source.json.emails.forEach(function(p){
                                if(chkDuplicatedChildren(pObj,p))
                                    emails.children.push({name : p.address });
                            });
                        }

                        if(p._source.json.phones){
                            children = [];
                            phones = { name: "phones", size:3000};
                            phones.children = children;
                                                    
                            p._source.json.phones.forEach(function(p){
                                if(chkDuplicatedChildren(pObj,p))
                                    phones.children.push({name : p.number });
                            });
                        }

                        if(p._source.json.addresses){
                            children = [];
                            addresses = { name: "addresses", size:3000};
                            addresses.children = children;
                                                    
                            p._source.json.addresses.forEach(function(p){
                                if(chkDuplicatedChildren(pObj,p)) {
                                    addresses.children.push({name : p.display, isQualified:p.sna_fully_qualified });
                                }
                            });
                        }


                    });
                }

                if(emails.children.length>0) _pipl.children.push(emails);
                if(phones.children.length>0) _pipl.children.push(phones);
                if(addresses.children.length>0) _pipl.children.push(addresses);    

                d.resolve(_pipl);
            }
        });
        return d.promise();
    };
    
    function chkDuplicatedChildren(pObj,p){
         switch(pObj.t){
             case 0:
                return pObj.k !== (p._source === undefined) ? p.display : p._source.json.names[0].display;
             case 1:
                return pObj.k !== p._source.json.phones[0].number;
             case 2:
                return pObj.k !== p._source.json.addresses[0].display;
             case 3:
                return pObj.k !== p._source.json.emails[0].address;
         }
    }

    smdb.SNANetwork = function(type,key) {
        
        var d = $.Deferred();
        var elasticserch = smdb.APIRequest(type,key);

        $.when(elasticserch).then(function(data)
        {
            var idx = 0;  
            var s = data.hits.hits[idx]._source.json;
            var queryPerson = data.hits.hits[idx]._source.json.names[0].display 
            var pipl = {};
            var relation = {},emails = {},phones = {}, urls = {},addresses={};

            //var s= data.hits.hits
            var root = { name: queryPerson, size: 42555,color: "purple", ntype:"root" }
            pipl = root;  //add obj to obj

            if(s.images !== undefined) root.image = s.images[0].url;
            
            //relations collections
            var children = [];            
            rtRelations = { name: "relation",size:3000};
            relation = rtRelations; 
            relation.children = children;
            
            if(s.relationships) {
                var nameJson = {}
                s.relationships.forEach(function(p){
                    nameJson = {name : p.names[0].display };
                    relation.children.push(nameJson)
                });
            }
            
            //email collections
            children = [];
            rtNames = { name: "emails", size:3000};
            emails = rtNames;
            emails.children = children;
                                    
            if(s.emails) {
                var nameJson = {}
                s.emails.forEach(function(p){
                    nameJson = {name : p.address };
                    emails.children.push(nameJson)
                });
            }
            
            //phones
            children = [];
            rtPhones = { name: "phones", size:3000};
            phones = rtPhones;
            phones.children = children;
                                    
            if(s.phones) {
                var _json = {}
                s.phones.forEach(function(p){
                    _json = {name : p.number };
                    phones.children.push(_json)
                });
            }       
            
            //urls
            children = [];
            rtUrls = { name: "urls", size:3000};
            urls = rtUrls;
            urls.children = children;
                                    
            if(s.urls) {
                var _json = {}
                s.urls.forEach(function(p){
                    _json = {name : p.url.split('/')[2]+"....", ctype: 'url', url: p.url };
                    urls.children.push(_json)
                });
            }
            
            //addresses
            children = [];
            rtAdds = { name: "addresses", size:3000};
            addresses = rtAdds;
            addresses.children = children;
                                    
            if(s.addresses) {
                var _json = {}
                s.addresses.forEach(function(p){
                    _json = {name : p.display, isQualified: p.sna_fully_qualified };
                    addresses.children.push(_json)
                });
            }        
            
            
            // comsolidate objs
            children = [];
            pipl.children = children;  //+array
            if(relation.children.length>0) pipl.children.push(relation);
            if(phones.children.length>0) pipl.children.push(phones);
            if(urls.children.length>0) pipl.children.push(urls);
            if(addresses.children.length>0) pipl.children.push(addresses);
            if(emails.children.length>0) pipl.children.push(emails);

            // pipl.children.push(relation,phones,urls,addresses,emails);
            // pipl.children.push(phones,addresses);
            // pipl.children.push(phones);

            // console.log("SN: "+JSON.stringify(pipl));

            d.resolve(pipl);
            
        });
        
        return d.promise();
    };
    
    
    var NodeType = (function () {
        function NodeType(type, linksarray, label, display, imagesarray) {
            this.type = type; 
            this.linksarray = linksarray;
            this.label = label;
            this.display = display;
            this.imagesarray = imagesarray;
        }
        NodeType.prototype.toString = function () {
            return this.type;
        };
        NodeType.prototype.next = function () {
            return this === smdb.Pipl ? smdb.Prop : smdb.Pipl;
        };
        NodeType.prototype.makeEdge = function (thisName, otherName) {
            return this === smdb.Pipl ? new Edge(thisName, otherName) : new Edge(otherName, thisName);
        };
        return NodeType;
    })();
    
    smdb.NodeType = NodeType;
    smdb.Pipl = new NodeType("pipl", "phones", "names","number", "images");  //mv
    smdb.Prop = new NodeType("prop", "names", "names","display", "images");  //ps
    
    var Node = (function () {
        function Node(type, id) {
            this.type = type;
            this.id = id;
            this.degree = 0;
        }
        Node.prototype.name = function () { return this.type + this.id.toString(); }; //get node name
        Node.prototype.getImage = function () {  //get node image
            var _this = this;
            var d = $.Deferred();
            var images = request(this.type, this.id, "images");
            
                $.when(images).then(function (i) {
                    var s = i.hits.hits[0]._source.json;
                    var paths = s[_this.type.imagesarray];  //pipl image paths
                    _this.imgurl = paths !== undefined  //get image
                        ? 'http://image.tmdb.org/t/p/w185/' + paths[0].file_path
                        : 'http://upload.wikimedia.org/wikipedia/commons/3/37/No_person.jpg';
                    d.resolve(_this);
                });
                return d.promise();
            
        };
        return Node;
    })();
    smdb.Node = Node;
    
    var Edge = (function () {
        function Edge(source, target) {
            this.source = source;
            this.target = target;
        }
        Edge.prototype.toString = function () {
            return this.source + '-' + this.target;
        };
        return Edge;
    })();
    smdb.Edge = Edge;
    
    var Graph = (function () {
        function Graph() {
            this.nodes = {};
            this.edges = {};
        }
        Graph.prototype.expandNeighbours = function (node, f) {
            var _this = this;
            var dn = node.cast.map(function (c) { 
                return _this.getNode(node.type.next(), c[node.type.display], function (v) {  //id=display city name
                v.label = c[v.type.label];
                _this.addEdge(node, v);
                f(v);
                }); 
            });
            var d = $.Deferred();
            $.when.apply($, dn)
                .then(function () {
                var neighbours = Array.prototype.slice.call(arguments);
                d.resolve(neighbours);
            });
            return d.promise();
        };
        Graph.prototype.fullyExpanded = function (node) {
            var _this = this;
            return node.cast && node.cast.every(function (v) { 
                return (node.type.next() + v.id) in _this.nodes; });
        };
        Graph.prototype.addNode = function (type, id) {
            var node = new Node(type, id);
            return this.nodes[node.name()] = node;
        };
        Graph.prototype.getNode = function (type, id, f) { //AVTQHxjAUd9mz_GNMhiv,{type: "pipl", linksarray: "addresses", label: "names", imagesarray: "images"}imagesarray: "images"label: "names"linksarray: "addresses"type: "pipl"__proto__: Object
            var _this = this;
            var d = $.Deferred();//localStorage
            var name = type + id.toString();
            if (name in this.nodes) {
                return this.nodes[name];
            }
            var node = this.addNode(type, id);
            f(node);
            var cast = request(type, id, null, type.credits);  //nodeType(movie, person), id(movie,person id), content(image), type(credits/)
            $.when(cast).then(function (c) {
                var s = c.hits.hits[0]._source.json;
                node.label = s[type.label][0][type.display];
                (node.cast = s[type.linksarray]).forEach(function (v) {
                    var neighbourname = type.next() + v[type.display]; //v.id.toString();
                    if (neighbourname in _this.nodes) {
                        _this.addEdge(node, _this.nodes[neighbourname]);
                    }
                });
                d.resolve(node);
            });
            return d.promise();
        };
        Graph.prototype.addEdge = function (u, v) {
            var edge = u.type.makeEdge(u.name(), v.name());
            var ename = edge.toString();
            if (!(ename in this.edges)) {
                this.edges[ename] = edge;
            }
            ++u.degree, ++v.degree;  //move up degrees, for both u and v nodes
        };
        
        return Graph;
    })();
    
    smdb.Graph = Graph;

    // smdb.NodeType = NodeType;
    // smdb.Movie = new NodeType("movie", "credits", "title", "posters");
    // smdb.Person = new NodeType("person", "movie_credits", "name", "profiles");
    // smdb.Node = Node;
    // smdb.Edge = Edge;
    // smdb.Graph = Graph;

    function request(type, id, content, append) {
       
        var query = "http://localhost:9200/test/person/_search?q=_id:" + id;
        
        if(type == "prop")
            query = "http://localhost:9200/test/person/_search?q=json.phones.number:" + id;
            
        return $.get(query);
        //    var data = {
        //         "size":100,    
        //             "query": {
        //                     "match": {
        //                     "_id": id
        //                     }
        //                 }
        //     };    
        //     var q1 = "http://localhost:9200/test/person/_search";
        //     return $.ajax({
        //         type: 'GET',
        //         url: q1,
        //         crossDomain: true,
        //         data: JSON.stringify(data),
        //         success: function(response){
        //             var data = response.hits.hits;
        //             var total = response.hits.total;
        //             //var network = sasBuildNetwork.netUtils(response,freq);
        //             //netClustering.cluster(network.nodes,network.edges);
        //             //update(network.nodes, network.edges);
        //             //console.log(network);

        //             console.log(total , data);
        //             //return data;
        //         },
        //         error: function(err){
        //             console.log(err);
        //         }
        //     });

        // if (content === void 0) { content = null; }
        // if (append === void 0) { append = null; }
        // var query = "https://api.themoviedb.org/3/" + type + "/" + id;
        // if (content) {
        //     query += "/" + content;
        // }
        // query += "?api_key=1bba0362f468d50d2ec27acff6d5e05a";
        // if (append) {
        //     query += "&append_to_response=" + append;
        // }
        // return $.get(query);
    }
        
})(smdb || (smdb = {}));