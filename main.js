$(function() {

    Graph = function () { this.init.apply(this, arguments); };
    Graph.prototype = {
        width:    1200,
        height:   600,
        charge:   -120,
        distance: 200,
        json: 'test.json',
        color: d3.scale.category20(),

        init: function (args) {
            var self = this;
            for (var key in args) {
                self[key] = args[key];
            }
            self.force = d3.layout.force().charge(self.charge)
                .linkDistance(self.distance).size([self.width, self.height]);
        },

        createSVG: function () {
            var self = this;
            self.svg = d3.select("body").append("svg")
                .attr("width", self.width).attr("height", self.height);
        },

        create: function () {
            var self = this;
            self.createSVG();
            d3.json(self.json, function(error, graph) {
                self.createGraph(graph);
            });
        },

        createGraph: function (graph) {
            var self = this;

            self.force.nodes(graph.nodes).links(graph.links).start();

            self.link = self.svg.selectAll(".link").data(graph.links)
                .enter().append("line").attr("class", "link")
                .style("stroke-width", function(d) { return Math.sqrt(d.weight); });

            self.node = self.svg.selectAll(".nodes").data(graph.nodes)
                .enter().append('g').call(self.force.drag);

            var imageSize = graph.nodes.length > 50 ? "20px" : "30px";
            self.image = self.node.append('image').attr('xlink:href', function (d) {
                return 'http://cdn1.www.st-hatena.com/users/' + d.id.substr(0, 2) + '/' + d.id + '/profile_l.gif';
            }).attr('width', imageSize).attr('height', imageSize);
            self.image.append("title").text(function(d) { return d.id; });

            self.text = self.node.append("text").text(function(d) { return d.id; })
                .attr("font-size","0.5em");

            self.force.on("tick", function() {
                self.link.attr("x1", function(d) { return d.source.x; })
                         .attr("y1", function(d) { return d.source.y; })
                         .attr("x2", function(d) { return d.target.x; })
                         .attr("y2", function(d) { return d.target.y; });

                self.image.attr("x", function(d) { return d.x-15; })
                          .attr("y", function(d) { return d.y-15; });

                self.text.attr("dx", function(d) { return d.x-15; })
                         .attr("dy", function(d) { return d.y+22; });
            });

            self.node.on('dblclick', function () {
                self.searchById($(this).find('text').text());
            });
        },

        searchById : function (id) {
            if ( id.length < 1 )  return;
            var level  = $('select[name=level] option:checked').val();
            var weight = $('select[name=weight] option:checked').val();
            
            this.destroy();
            this.createSVG();
            this.searchJsonById(id, +level, +weight);
        },

        searchJsonById: function (id, maxLevel, weight) {
            var self = this;
            
            var json = $.getJSON(self.json, function (json) {
                // 対象ユーザのインデックスを取得
                var index = 0;
                for (; index < json.nodes.length; index++) {
                    if (json.nodes[index].id === id) break;
                }

                // ユーザを含むエッジを取得し、それ以外を除去
                var hasLink = {};
                hasLink[index] = true;
                for (var level = 1; level < maxLevel + 1; level++) {
                    var tmpHasLink = $.extend({}, hasLink);
                    for (var i = json.links.length - 1; i >= 0; i--) {
                        var link = json.links[i];
                        if ( link.weight < weight ) {
                            json.links.splice(i, 1);
                            continue;
                        }
                        if (tmpHasLink[link.source]) { hasLink[link.target] = true; }
                        else if (tmpHasLink[link.target]) { hasLink[link.source] = true; }
                        else if (level === maxLevel) { json.links.splice(i, 1); }
                    }
                }

                // source, targetを置換するハッシュを生成
                var indexMap = {};
                var diff = 0;
                var nodeLength = json.nodes.length;
                for (var i = j = 0; i < nodeLength; i++) {
                    if (!hasLink[i]) {
                        diff++;
                        json.nodes.splice(j, 1);
                        continue;
                    }
                    indexMap[i] = i - diff;
                    j++;
                }

                for (var i = 0; i < json.links.length; i++) {
                    json.links[i].source = indexMap[json.links[i].source];
                    json.links[i].target = indexMap[json.links[i].target];
                }

                self.createGraph(json);
            });
        },

        destroy: function () {
            this.force.stop();
            this.svg.remove();
        }
    };

    var graph = new Graph({ json: 'json/uscs.json' });
    graph.createSVG();
    $(document).on('click', '.search-button', function () {
        var id = $('.input-id').val();
        graph.searchById(id);
    });
});