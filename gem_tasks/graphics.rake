require 'fileutils'
require 'lib/handle_js_files'

GRAPHICS_SRC = File.join(GEM_ROOT, 'src', 'graphics')
SPARKLINES_SRC_SCRIPTS = File.join(GRAPHICS_SRC, 'sparklines') + "/*.js"
GANTTVIEW_SRC = File.join(GRAPHICS_SRC, 'ganttView')
GANTTVIEW_SRC_SCRIPTS = GANTTVIEW_SRC + "/*.js"

HIGHCHARTS_SRC = File.join(GRAPHICS_SRC, 'highcharts')
high_scripts = [
    'js/highcharts.js',
    'js/exporting.js'
].collect { |filename| File.read(File.join(HIGHCHARTS_SRC, filename)) }.join "\n\n"
HIGHCHARTS_SRC_THEMES = File.join(HIGHCHARTS_SRC, 'themes')
HIGHCHARTS_SRC_IMAGES = File.join(HIGHCHARTS_SRC, 'images')

GRAPHICS_DEST_TEMPLATES = File.join(GEM_ROOT, 'templates', 'graphics')
GRAPHICS_DEST_THEMES = File.join(GRAPHICS_DEST_TEMPLATES, 'jquery')
HIGHCHARTS_DEST_THEMES = File.join(GRAPHICS_DEST_TEMPLATES, 'highcharts')
HIGHCHARTS_DEST_IMAGES = File.join(GRAPHICS_DEST_THEMES, 'highcharts')

GRAPHICS_MESSAGE1 = "# Generated by compass-jquery-plugin/gem-tasks/graphics.rake\n# Install with: compass install jquery/graphics\n\n"
GRAPHICS_MESSAGE2 = "// Generated by compass-jquery-plugin/gem-tasks/graphics.rake\n\n"

namespace :build do
  desc 'Build the stylesheets and templates for jQuery.'
  task :graphics do

    FileUtils.remove_dir GRAPHICS_DEST_TEMPLATES if File.exists? GRAPHICS_DEST_TEMPLATES
    FileUtils.mkdir_p(File.join(GRAPHICS_DEST_TEMPLATES, 'config', 'initializers'))

    open File.join(GRAPHICS_DEST_TEMPLATES, 'manifest.rb'), 'w' do |manifest|
      manifest.print GRAPHICS_MESSAGE1

      open File.join(GRAPHICS_DEST_TEMPLATES, 'config', 'initializers', 'graphics.rb'), 'w' do |f|
        f.print(File.read(File.join(GRAPHICS_SRC, 'config', 'initializers', 'graphics.rb')))
      end
      manifest.print "file 'config/initializers/graphics.rb'\n"

      # jQuery Sparklines

      open File.join(GRAPHICS_DEST_TEMPLATES, 'jquery.sparkline.js'), 'w' do |f|
        f.print concat_files(all_files(SPARKLINES_SRC_SCRIPTS))
      end
      manifest.print "javascript 'jquery.sparkline.js'\n"

      open File.join(GRAPHICS_DEST_TEMPLATES, 'jquery.sparkline.min.js'), 'w' do |f|
        f.print compress_js(all_files(SPARKLINES_SRC_SCRIPTS), "google")
      end
      manifest.print "javascript 'jquery.sparkline.min.js'\n"

      # jQuery GanttView

      open File.join(GRAPHICS_DEST_TEMPLATES, 'jquery.ganttView.js'), 'w' do |f|
        f.print concat_files(all_files(GANTTVIEW_SRC_SCRIPTS))
      end
      manifest.print "javascript 'jquery.ganttView.js'\n"

      open File.join(GRAPHICS_DEST_TEMPLATES, 'jquery.ganttView.min.js'), 'w' do |f|
        f.print compress_js(all_files(GANTTVIEW_SRC_SCRIPTS), "google")
      end
      manifest.print "javascript 'jquery.ganttView.min.js'\n"

      FileUtils.mkdir_p(File.join(GRAPHICS_DEST_THEMES))
      css = File.read File.join(GANTTVIEW_SRC, 'jquery.ganttView.css')
      sass = ''
      IO.popen("sass-convert -F css -T scss", 'r+') { |f| f.print(css); f.close_write; sass = f.read }
      open File.join(GRAPHICS_DEST_THEMES, 'ganttView.scss'), 'w' do |f|
        f.write sass
      end
      manifest.print "stylesheet 'jquery/ganttView.scss'\n"

      # Highcharts
      open File.join(GRAPHICS_DEST_TEMPLATES, 'jquery.highcharts.js'), 'w' do |f|
        f.print concat_files(high_scripts)
      end
      manifest.print "javascript 'jquery.highcharts.js'\n"

      open File.join(GRAPHICS_DEST_TEMPLATES, 'jquery.highcharts.min.js'), 'w' do |f|
        f.print compress_js(high_scripts, "google")
      end
      manifest.print "javascript 'jquery.highcharts.min.js'\n"

      FileUtils.mkdir_p(HIGHCHARTS_DEST_THEMES)

      # Convert the stylesheets

      Dir.foreach File.join(HIGHCHARTS_SRC_THEMES) do |file|
        next unless /\.js$/ =~ file
        js = File.read File.join(HIGHCHARTS_SRC_THEMES, file)
        open File.join(HIGHCHARTS_DEST_THEMES, file), 'w' do |f|
          f.print concat_files(js)
        end
        manifest.print "javascript 'highcharts/#{file}'\n"

        file.gsub!(/\.js$/, '.min.js')
        open File.join(HIGHCHARTS_DEST_THEMES, file), 'w' do |f|
          f.print compress_js(js, "google")
        end
        manifest.print "javascript 'highcharts/#{file}'\n"
      end

      # Copy the images directory
      FileUtils.mkdir_p File.join(HIGHCHARTS_DEST_IMAGES)
      src_dir = HIGHCHARTS_SRC_IMAGES
      dest_dir = HIGHCHARTS_DEST_IMAGES

      Dir.foreach(src_dir) do |image|
        next unless /\.jpg$/ =~ image
        FileUtils.cp(File.join(src_dir, image), dest_dir)
        manifest.print "image 'jquery/highcharts/#{image}'\n"
      end
    end
  end
end
  