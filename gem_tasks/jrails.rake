require 'fileutils'
require 'lib/handle_js_files'
require 'lib/jquery.ui'

# Compass generator for jrails 0.1+
JRAILS_SRC = File.join(GEM_ROOT, 'src', 'jrails', 'jrails.1.4.2')
JRAILS_SRC_SCRIPTS = JRAILS_SRC + "/*.js"

JHAML_SRC_SCRIPTS = File.join(GEM_ROOT, 'src', 'jrails', 'jquery-haml') + "/*.js"

FLASH_SRC = File.join(GEM_ROOT, 'src', 'jrails', 'flash_messages')
FLASH_SRC_IMAGES = File.join(FLASH_SRC, 'images')

JQUERY_SRC = File.join(GEM_ROOT, 'src', 'jrails', 'jquery.1.4.2')
JQUERY_SRC_SCRIPTS = JQUERY_SRC + "/*.js"

JQUERY_UI_18_SRC = File.join(GEM_ROOT, 'src', 'jrails', 'jquery.ui.1.8.2')
JQUERY_UI_18_SRC_SCRIPTS = File.join(JQUERY_UI_18_SRC, 'js') + "/*.js"
JQUERY_UI_18_SRC_THEMES = File.join(JQUERY_UI_18_SRC, 'themes')
JQUERY_UI_18_SRC_TRANSLATIONS = File.join(JQUERY_UI_18_SRC, 'js', 'i18n') #+ "/*.js"

JRAILS_DEST_TEMPLATES = File.join(GEM_ROOT, 'templates', 'jrails')
JRAILS_DEST_TRANSLATIONS = File.join(JRAILS_DEST_TEMPLATES, 'i18n', 'jquery.ui')
JRAILS_DEST_THEMES = File.join(JRAILS_DEST_TEMPLATES, 'jquery.ui')
JRAILS_DEST_IMAGES = File.join(JRAILS_DEST_TEMPLATES, 'jquery.ui')
FLASH_DEST_STYLESHEETS = File.join(JRAILS_DEST_TEMPLATES, 'partials')
FLASH_DEST_IMAGES = File.join(JRAILS_DEST_IMAGES, 'flash_messages')

namespace :build do
  desc 'Build the stylesheets and templates for jRails.'
  task :jrails do    
    
    FileUtils.remove_dir JRAILS_DEST_TEMPLATES if File.exists? JRAILS_DEST_TEMPLATES   
    FileUtils.mkdir_p(File.join(JRAILS_DEST_TEMPLATES, 'config', 'initializers'))
    FileUtils.mkdir_p(File.join(JRAILS_DEST_THEMES))
    
    open File.join(JRAILS_DEST_TEMPLATES, 'manifest.rb'), 'w' do |manifest|
   
      # jRails
       
      manifest.print JRAILS_MESSAGE1
      
      open File.join(JRAILS_DEST_TEMPLATES, 'config', 'initializers', 'jrails.rb'), 'w' do |f|
        f.print(File.read(File.join(JRAILS_SRC, 'config', 'initializers', 'jrails.rb')))
      end
      manifest.print "file 'config/initializers/jrails.rb'\n" 
    
      open File.join(JRAILS_DEST_TEMPLATES, 'jrails.js'), 'w' do |f|
        f.print concat_files(all_files(JRAILS_SRC_SCRIPTS))
      end
      manifest.print "javascript 'jrails.js'\n" 
    
      open File.join(JRAILS_DEST_TEMPLATES, 'jrails.min.js'), 'w' do |f|
        f.print compress_js(all_files(JRAILS_SRC_SCRIPTS), "google")
      end
      manifest.print "javascript 'jrails.min.js'\n" 
      
      #Flash Messages   
      FileUtils.mkdir_p(File.join(FLASH_DEST_STYLESHEETS))   
      css = File.read File.join(FLASH_SRC, 'flash_messages.css')
      sass = ''
      IO.popen("sass-convert -F css -T scss", 'r+') { |f| f.print(css); f.close_write; sass = f.read }
      open File.join(FLASH_DEST_STYLESHEETS, '_flash_messages.scss'), 'w' do |f|
        f.write sass
      end
      manifest.print "stylesheet 'partials/_flash_messages.scss', :media => 'screen, projection'\n"    
      
      # Copy the images directory
      FileUtils.mkdir_p File.join(FLASH_DEST_IMAGES)
      src_dir = FLASH_SRC_IMAGES
      dest_dir = FLASH_DEST_IMAGES   
      
      Dir.foreach(src_dir) do |image|
        next unless /\.png$/ =~ image
        FileUtils.cp(File.join(src_dir, image), dest_dir)    
        manifest.print "image 'jquery.ui/flash_messages/#{image}'\n"
      end      
      
      # jQuery haml
     
      open File.join(JRAILS_DEST_TEMPLATES, 'jquery.haml.js'), 'w' do |f|
        f.print concat_files(all_files(JHAML_SRC_SCRIPTS))
      end
      manifest.print "javascript 'jquery.haml.js'\n" 
    
      open File.join(JRAILS_DEST_TEMPLATES, 'jquery.haml.min.js'), 'w' do |f|
        f.print compress_js(all_files(JHAML_SRC_SCRIPTS), "google")
      end
      manifest.print "javascript 'jquery.haml.min.js'\n"       
      
      # jQuery 1.4
    
      open File.join(JRAILS_DEST_TEMPLATES, 'jquery-1.4.2.js'), 'w' do |f|
        f.print concat_files(all_files(JQUERY_SRC_SCRIPTS))
      end
      manifest.print "javascript 'jquery-1.4.2.js'\n" 
    
      open File.join(JRAILS_DEST_TEMPLATES, 'jquery-1.4.2.min.js'), 'w' do |f|
        f.print compress_js(all_files(JQUERY_SRC_SCRIPTS), "google")
      end
      manifest.print "javascript 'jquery-1.4.2.min.js'\n" 
      
      # jQuery 1.4 Comapt 1.3
      
      ['compat-1.3'].each do |path|
        Dir.foreach File.join(JQUERY_SRC, path) do |file|
          next unless /\.js$/ =~ file
          js = File.read File.join(JQUERY_SRC, path, file)
          manifest.print "javascript '#{file}'\n"
          open File.join(JRAILS_DEST_TEMPLATES, file), 'w' do |f|
            f.write js
          end               
          file.gsub!(/\.js$/, '.min.js')
          manifest.print "javascript '#{file}'\n"
          open File.join(JRAILS_DEST_TEMPLATES, file), 'w' do |f|
            f.write compress_js(js, "google")
          end
        end
      end   
      
      # jQuery 1.4 Plugins
      
      ['plugins'].each do |path|
        Dir.foreach File.join(JQUERY_SRC, path) do |file|
                    
          if /\.css$/ =~ file
            css = File.read File.join(JQUERY_SRC, path, file)
            sass = ''
            IO.popen("sass-convert -F css -T scss", 'r+') { |f| f.print(css); f.close_write; sass = f.read }
            file.gsub!(/^jquery\./,'').gsub!(/\.css$/, '.scss')
            open File.join(JRAILS_DEST_THEMES, file), 'w' do |f|
              f.write sass
            end
            manifest.print "stylesheet 'jquery.ui/#{file}', :media => 'screen, projection'\n"    
          end     
          
          next unless /\.js$/ =~ file
          js = File.read File.join(JQUERY_SRC, path, file)
          manifest.print "javascript '#{file}'\n"
          open File.join(JRAILS_DEST_TEMPLATES, file), 'w' do |f|
            f.write js
          end               
          file.gsub!(/\.js$/, '.min.js')
          manifest.print "javascript '#{file}'\n"
          open File.join(JRAILS_DEST_TEMPLATES, file), 'w' do |f|
            f.write compress_js(js, "google")
          end
        end
      end     
      
      Dir.foreach File.join(JQUERY_SRC, 'plugins', 'images')  do |plugin|
        next if /^\./ =~ plugin
  
        # Copy the theme images directory
        src_dir = File.join(JQUERY_SRC, 'plugins', 'images', plugin)
        dest_dir = File.join(JRAILS_DEST_IMAGES, plugin)
        FileUtils.mkdir_p dest_dir
        
        Dir.foreach(src_dir) do |image|
          next if /^\./ =~ image
          FileUtils.cp(File.join(src_dir, image), dest_dir)    
          manifest.print "image 'jquery.ui/#{plugin}/#{image}'\n"
        end
      end      
    
      # jQuery.UI 1.8.2
    
      # Scripts
      
      all_jquery_ui_scripts = [   
        'jquery-ui.js',
        'jquery.effects.blind.js',
        'jquery.effects.bounce.js',
        'jquery.effects.clip.js',
        'jquery.effects.core.js',
        'jquery.effects.drop.js',
        'jquery.effects.explode.js',
        'jquery.effects.fade.js',
        'jquery.effects.fold.js',
        'jquery.effects.highlight.js',
        'jquery.effects.pulsate.js',
        'jquery.effects.scale.js',
        'jquery.effects.shake.js',
        'jquery.effects.slide.js',
        'jquery.effects.transfer.js',
        'jquery.ui.accordion.js',
        'jquery.ui.autocomplete.js',
        'jquery.ui.button.js',
        'jquery.ui.core.js',
        'jquery.ui.datepicker.js',
        'jquery.ui.dialog.js',
        'jquery.ui.draggable.js',
        'jquery.ui.droppable.js',
        'jquery.ui.mouse.js',
        'jquery.ui.position.js',
        'jquery.ui.progressbar.js',
        'jquery.ui.resizable.js',
        'jquery.ui.selectable.js',
        'jquery.ui.slider.js',
        'jquery.ui.sortable.js',
        'jquery.ui.tabs.js',
        'jquery.ui.widget.js'
      ].collect {|filename| File.read(File.join(JQUERY_UI_18_SRC, 'js', filename))}.join "\n\n"  
      
      open File.join(JRAILS_DEST_TEMPLATES, 'jquery-ui-1.8.2.js'), 'w' do |f|
        f.print concat_files(all_jquery_ui_scripts)
      end
      manifest.print "javascript 'jquery-ui-1.8.2.js'\n"
    
      open File.join(JRAILS_DEST_TEMPLATES, 'jquery-ui-1.8.2.min.js'), 'w' do |f|
        f.print compress_js(all_jquery_ui_scripts, "google")
      end
      manifest.print "javascript 'jquery-ui-1.8.2.min.js'\n"
      
      # jQuery UI locales
  
      ['i18n'].each do |path|
        FileUtils.mkdir_p(JRAILS_DEST_TRANSLATIONS)
        Dir.foreach JQUERY_UI_18_SRC_TRANSLATIONS do |file|
          next unless /^jquery.ui\.datepicker-(.+)\.js$/ =~ file
          lang = file
          js = File.read File.join(JQUERY_UI_18_SRC_TRANSLATIONS, file)
          file.gsub!(/^jquery.ui\./,'')          
          manifest.print "javascript '#{File.join(path, 'jquery.ui', file)}'\n"
          open File.join(JRAILS_DEST_TRANSLATIONS, file), 'w' do |f|
            f.write js
          end               
          file.gsub!(/\.js$/, '.min.js')
          manifest.print "javascript '#{File.join(path, 'jquery.ui', file)}'\n"
          open File.join(JRAILS_DEST_TRANSLATIONS, file), 'w' do |f|
            f.write compress_js(js, "google")
          end
        end
      end

      # jQuery UI Themes
      
      ui = JqueryUiTheme.new(File.join(JQUERY_UI_18_SRC_THEMES, 'base')) 
      ui.convert_css(File.join(JRAILS_DEST_THEMES, '_partials'))
       
      all_jquery_ui_stylesheets = [
        '_core.scss',
        '_accordion.scss',
        '_autocomplete.scss',
        '_button.scss',
        '_datepicker.scss',
        '_dialog.scss',
        '_progressbar.scss',
        '_resizable.scss',
        '_selectable.scss',
        '_slider.scss',
        '_tabs.scss',
        '_theme.scss'
        ].collect {|filename| File.read(File.join(JRAILS_DEST_THEMES, '_partials', filename))}.join "\n\n"  
                
      open File.join(JRAILS_DEST_THEMES, '_theme.scss'), 'w' do |f|
        sass = JRAILS_MESSAGE2
        f.print(all_jquery_ui_stylesheets)
        f.print sass
        FileUtils.rm_r(File.join(JRAILS_DEST_THEMES, '_partials'))
      end 
      
      manifest.print "stylesheet 'jquery.ui/_theme.scss', :media => 'screen, projection'\n" 
      
      Dir.foreach JQUERY_UI_18_SRC_THEMES do |theme|
        next if /^\./ =~ theme
  
        # Convert the stylesheet
        manifest.print "stylesheet 'jquery.ui/#{theme}.scss', :media => 'screen, projection'\n"
        ui.convert_theme(theme, File.join(JQUERY_UI_18_SRC_THEMES, theme), File.join(JRAILS_DEST_THEMES))
  
        # Copy the theme images directory
        src_dir = File.join(JQUERY_UI_18_SRC_THEMES, theme, 'images')
        dest_dir = File.join(JRAILS_DEST_IMAGES, theme)
        FileUtils.mkdir_p dest_dir
                
        Dir.foreach(src_dir) do |image|
          next if /^\./ =~ image
          FileUtils.cp(File.join(src_dir, image), dest_dir)    
          manifest.print "image 'jquery.ui/#{theme}/#{image}'\n"
        end     
      end
    end   
  end
end

namespace :jrails do
  desc 'Remove the prototype / script.aculo.us javascript files'
  task :scrub_default_js do
    files = %W[controls.js dragdrop.js effects.js prototype.js]
    project_dir = File.join(RAILS_ROOT, 'public', 'javascripts')
    files.each do |fname|
      FileUtils.rm File.join(project_dir, fname)
    end
  end
end
  