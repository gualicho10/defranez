# Exports, for every group/component in the open SketchUp model, which TAGS it sits under and its bounding box,
# in the same space as the SimLab .glb (metres, Y up: x, z_sketchup, -y_sketchup). The web walkthrough uses it to
# assign every exported piece to its tag (the .glb exporter drops tags).
#
# Use: SketchUp → Window → Ruby Console →  load '/full/path/to/sketchup-export-tags.rb'
# Writes ~/Desktop/casa-tags.json. Read-only: it does not modify the model.
require 'json'

module DefranezTagExport
  def self.run(path = File.join(ENV['HOME'], 'Desktop', 'casa-tags.json'))
    model = Sketchup.active_model
    items = []
    walk = lambda do |ents, tr, tags, names|
      faces = ents.grep(Sketchup::Face)
      unless faces.empty?
        boxes = Hash.new { |h, k| h[k] = Geom::BoundingBox.new }
        counts = Hash.new(0)
        faces.each do |f|
          tag = f.layer.name
          f.vertices.each { |v| boxes[tag].add(v.position.transform(tr)) }
          counts[tag] += 1
        end
        boxes.each do |tag, bb|
          mn = bb.min; mx = bb.max
          items << { 'path' => tags, 'face_tag' => tag, 'names' => names, 'faces' => counts[tag],
                     'b' => [mn.x.to_m, mn.z.to_m, -mx.y.to_m, mx.x.to_m, mx.z.to_m, -mn.y.to_m].map { |v| v.to_f.round(3) } }
        end
      end
      ents.each do |e|
        next unless e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
        next if e.hidden?
        label = e.name.to_s.empty? ? e.definition.name.to_s : e.name.to_s
        walk.call(e.definition.entities, tr * e.transformation, tags + [e.layer.name], names + [label])
      end
    end
    walk.call(model.entities, Geom::Transformation.new, [], [])
    File.write(path, JSON.generate({ 'space' => 'metres, y-up = (x, z_su, -y_su)',
                                     'tags' => model.layers.map { |l| [l.name, l.visible?] },
                                     'items' => items }))
    puts "OK: #{items.size} items -> #{path}"
  rescue => err
    puts "ERROR: #{err.class}: #{err.message}\n#{err.backtrace.first(3).join("\n")}"
  end
end

DefranezTagExport.run
