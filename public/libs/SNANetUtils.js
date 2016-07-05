/* D3 Cola Network */
'use strct';

var sasBuildNetwork = {
   version:  "0.1.0" 
}; 

(function() {
    sasBuildNetwork.netUtils = function (dataJson, minLinkValue){
        var nodes = [], edges = [];
                var nodesMap = d3.map();
                var edgesCount = d3.map();

                minLinkValue = minLinkValue!==undefined ? minLinkValue: 0;

                function getNodeOrCreate(t) {
                    var node;
                    if (!nodesMap.has(t)) {
                        nodesMap.set(t, {"name":t, "value":0});
                    }
                    return nodesMap.get(t);

                }

                function addCount(t) {
                    var node = getNodeOrCreate(t);  //nodename = t
                    node.value+=1;                  //nodevlaue = 1
                    nodesMap.set(t, node);
                    return node;
                }

                dataJson.hits.hits.forEach(function (d) {
                    var tags = d._source.title.split(/[ ,]+/);
                    var arthor = d._source.author;
                    console.log(tags);
                    tags.forEach(function (t1=t1.toLowerCase()) {  //2
                        tags.forEach(function (t2) {
                            if (t1===t2  || stringMatch(t2) == 1 || stringMatch(t1) == 1 ) {
                                return;
                            }
                            addCount(t1);
                            addCount(t2);

                            var key = t1<t2 ? t1 + "," + t2 : t2 + "," + t1;
                            if (edgesCount.has(key)){
                                edgesCount.set(key, edgesCount.get(key) + 1 );
                            } else {
                                edgesCount.set(key, 0);
                            }

                        });
                    });
                });


                edges = edgesCount.entries().filter(function (d) { 
                    return d.value > minLinkValue; 
                }).map(function (d)  {
                    var t1,t2;
                    t1 = d.key.split(",")[0];
                    t2 = d.key.split(",")[1];
                    var node1 = getNodeOrCreate(t1);
                    var node2 = getNodeOrCreate(t2);
                    if (nodes.indexOf(node1)===-1) { nodes.push(node1); }
                    if (nodes.indexOf(node2)===-1) { nodes.push(node2); }
                    return {
                        source:node1,
                        target:node2,
                        value:d.value
                    };
                });
                return {"nodes": nodes, "edges":edges};
    };
    
    var stringMatch = function(str){
        var byPassMap = ["is","a","the","to","for","of","as","on","by","in","&","-","and"];

        return (byPassMap.indexOf(str) > 0) ? 1 : -1;

        // for(var j=0; j< byPassMap.length;j++)
        //     if(byPassMap[j].match(str.toLowerCase())) return j;
    }
    
})();

var tmdb;
(function (tmdb) {
    
    var NodeType = (function () {
        function NodeType(type, credits, label, imagesarray) {  //credit cast,crew
            this.type = type; //movie, person while search
            this.credits = credits;
            this.label = label;
            this.imagesarray = imagesarray;
        }
        NodeType.prototype.toString = function () {
            return this.type;
        };
        NodeType.prototype.next = function () {
            return this === tmdb.Movie ? tmdb.Person : tmdb.Movie;
        };
        NodeType.prototype.makeEdge = function (thisName, otherName) {
            return this === tmdb.Movie ? new Edge(thisName, otherName) : new Edge(otherName, thisName);
        };
        return NodeType;
    })();
    
    // tmdb.NodeType = NodeType;
    // tmdb.Movie = new NodeType("movie", "credits", "title", "posters");
    // tmdb.Person = new NodeType("person", "movie_credits", "name", "profiles");
    
    var Node = (function () {
        function Node(type, id) {
            this.type = type;
            this.id = id;
            this.degree = 0;
        }
        Node.prototype.name = function () { return this.type + this.id.toString(); };
        Node.prototype.getImage = function () {
            var _this = this;
            var d = $.Deferred();
            var images = request(this.type, this.id, "images");
            $.when(images).then(function (i) {
                var paths = i[_this.type.imagesarray];
                _this.imgurl = paths.length > 0
                    ? 'http://image.tmdb.org/t/p/w185/' + paths[0].file_path
                    : 'http://upload.wikimedia.org/wikipedia/commons/3/37/No_person.jpg';
                d.resolve(_this);
            });
            return d.promise();
        };
        return Node;
    })();
    
    // tmdb.Node = Node;
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
    
    // tmdb.Edge = Edge;
    
    var Graph = (function () {
        function Graph() {
            this.nodes = {};
            this.edges = {};
        }
        Graph.prototype.expandNeighbours = function (node, f) {
            var _this = this;
            var dn = node.cast.map(function (c) { 
                return _this.getNode(node.type.next(), c.id, function (v) {
                v.label = c[v.type.label];
                _this.addEdge(node, v);
                f(v);
            }); });
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
        Graph.prototype.getNode = function (type, id, f) { //tmbd.movie, movie_id (505), addViewNode(cb)
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
                node.label = c[type.label];
                (node.cast = c[type.credits].cast).forEach(function (v) {
                    var neighbourname = type.next() + v.id.toString();
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
    
    // tmdb.Graph = Graph;

    tmdb.NodeType = NodeType;
    tmdb.Movie = new NodeType("movie", "credits", "title", "posters");
    tmdb.Person = new NodeType("person", "movie_credits", "name", "profiles");
    tmdb.Node = Node;
    tmdb.Edge = Edge;
    tmdb.Graph = Graph;

    function request(type, id, content, append) {
        if (content === void 0) { content = null; }
        if (append === void 0) { append = null; }
        var query = "https://api.themoviedb.org/3/" + type + "/" + id;
        if (content) {
            query += "/" + content;
        }
        query += "?api_key=1bba0362f468d50d2ec27acff6d5e05a";
        if (append) {
            query += "&append_to_response=" + append;
        }
        return $.get(query);
    }
        
})(tmdb || (tmdb = {}));